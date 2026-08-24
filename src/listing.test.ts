import { describe, expect, it } from 'vitest';

import { verifyListingPr, type PrPayload, type RegistryState } from './verify/pipeline.js';
import { ensureDiscoveryLink, discoveryProductName } from './payments/discovery.js';
import { appendRecord, ImmutabilityError, type ListingRecord } from './registry/records.js';

function payload(overrides: Partial<PrPayload> = {}): PrPayload {
  return {
    schema: 'reposell-listing/v1',
    repository: { url: 'https://github.com/seller/project', owner: 'seller', name: 'project' },
    release: { version: 'v2.4.1', commit: '8f92a1' },
    sell: { url: 'https://seller.example/sell', payment_link: 'https://buy.stripe.com/SELLER_LINK' },
    listing: { discovery_price: { amount: 5, currency: 'USD' } },
    ...overrides,
  };
}

function sellPage(embedded: unknown): string {
  return `<html><script type="application/json" id="reposell-data">${JSON.stringify(embedded)}</script></html>`;
}

function fetchMap(routes: Record<string, { status?: number; body: string }>) {
  return async (url: string) => {
    const entry = Object.entries(routes).find(([pattern]) => url.includes(pattern));
    if (entry === undefined) return { ok: false, status: 404, text: async () => '' };
    return { ok: (entry[1].status ?? 200) < 400, status: entry[1].status ?? 200, text: async () => entry[1].body };
  };
}

const healthyEmbedded = {
  schema: 'reposell/sell-page/v1',
  repository: 'seller/project',
  releases: [
    { version: 'v2.4.1', status: 'available', offers: [{ paymentLink: 'https://buy.stripe.com/SELLER_LINK' }] },
  ],
};

const emptyRegistry: RegistryState = { listedRepositories: [], records: {} };

describe('verifyListingPr (§4)', () => {
  it('PASSes a fully valid PR against a live, matching /sell', async () => {
    const report = await verifyListingPr({
      pr: payload(),
      registry: emptyRegistry,
      fetchImpl: fetchMap({
        '/releases/v2.4.1': { body: '{"schema":"reposell/release/v1"}' },
        'signature.json': { body: '{"signature":"x"}' },
        'seller.example': { body: sellPage(healthyEmbedded) },
      }),
    });
    expect(report.verdict).toBe('PASS');
    expect(report.steps).toHaveLength(13);
  });

  it('§19 negative: seller Stripe link changed → BLOCKED', async () => {
    const pr = payload();
    pr.sell.payment_link = 'https://buy.stripe.com/OLD_LINK';
    const report = await verifyListingPr({
      pr,
      registry: emptyRegistry,
      fetchImpl: fetchMap({
        '/releases/v2.4.1': { body: '{}' },
        'signature.json': { body: '{"signature":"x"}' },
        'seller.example': { body: sellPage(healthyEmbedded) },
      }),
    });
    expect(report.verdict).toBe('BLOCKED');
    expect(report.steps.find((entry) => entry.step === '10-seller-payment-link')?.ok).toBe(false);
  });

  it('§19 negative: seller Stripe link missing → BLOCKED', async () => {
    const pr = payload();
    pr.sell.payment_link = '';
    const report = await verifyListingPr({
      pr,
      registry: emptyRegistry,
      fetchImpl: fetchMap({ 'seller.example': { body: sellPage(healthyEmbedded) } }),
    });
    expect(report.verdict).toBe('BLOCKED');
  });

  it('§19 negative: unsigned build → BLOCKED', async () => {
    const report = await verifyListingPr({
      pr: payload(),
      registry: emptyRegistry,
      fetchImpl: fetchMap({
        '/releases/v2.4.1': { body: '{}' },
        'signature.json': { status: 404, body: 'not found' },
        'seller.example': { body: sellPage(healthyEmbedded) },
      }),
    });
    expect(report.verdict).toBe('BLOCKED');
    expect(report.steps.find((entry) => entry.step === '05-signature')?.ok).toBe(false);
  });

  it('§19 negative: duplicate listing → BLOCKED', async () => {
    const report = await verifyListingPr({
      pr: payload(),
      registry: {
        listedRepositories: ['seller/project'],
        records: {},
      },
      fetchImpl: fetchMap({
        '/releases/v2.4.1': { body: '{}' },
        'signature.json': { body: '{"signature":"x"}' },
        'seller.example': { body: sellPage(healthyEmbedded) },
      }),
    });
    expect(report.verdict).toBe('BLOCKED');
    expect(report.steps.find((entry) => entry.step === '12-duplicates-immutability')?.ok).toBe(false);
  });

  it('§17 negative: Stripe secret in the PR payload → BLOCKED', async () => {
    const pr = payload();
    // SAFETY: fixture simulates an attacker pasting a secret into the PR.
    (pr as unknown as Record<string, unknown>)['note'] = 'sk_test_51Hx';
    const report = await verifyListingPr({
      pr,
      registry: emptyRegistry,
      fetchImpl: fetchMap({ 'seller.example': { body: sellPage(healthyEmbedded) } }),
    });
    expect(report.verdict).toBe('BLOCKED');
    expect(report.steps.find((entry) => entry.step === '13-security')?.ok).toBe(false);
  });
});

describe('discovery Stripe automation (§6-§7)', () => {
  function stripeDouble(existingProducts: Array<{ id: string; name: string }> = []) {
    const created: Array<{ path: string; body: Record<string, string> }> = [];
    const impl = async (url: string, init: { method: string; body?: string }) => {
      const path = url.replace('https://api.stripe.com/v1/', '');
      const body: Record<string, string> = {};
      if (init.body !== undefined) {
        for (const pair of init.body.split('&')) {
          const [k, v] = pair.split('=');
          if (k !== undefined && v !== undefined) body[decodeURIComponent(k)] = decodeURIComponent(v);
        }
      }
      if (path.startsWith('products/search')) {
        const wanted = decodeURIComponent(path.match(/name:"([^"]+)"/)?.[1] ?? '');
        const hit = existingProducts.find((product) => product.name === wanted);
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: hit === undefined ? [] : [{ id: hit.id }] }),
        };
      }
      created.push({ path, body });
      const ids: Record<string, string> = { products: 'prod_new', prices: 'price_new', payment_links: 'plink_new' };
      const id = ids[path] ?? 'id';
      return {
        ok: true,
        status: 200,
        json: async () =>
          path === 'payment_links' ? { id, url: 'https://buy.stripe.com/discovery' } : { id },
      };
    };
    return { impl, created };
  }

  it('creates product, price and payment link with discovery-only metadata', async () => {
    const { impl, created } = stripeDouble();
    const record = await ensureDiscoveryLink({
      apiKey: 'sk_test_listing',
      input: {
        repository: 'seller/project',
        release: 'v2.4.1',
        amount: 5,
        currency: 'USD',
        baseUrl: 'https://listing.reposell.dev',
      },
      fetchImpl: impl,
    });
    expect(record.payment_link_id).toBe('plink_new');
    const priceCall = created.find((call) => call.path === 'prices');
    // §19 negative-proof: seller price $100 never appears; discovery is 500 cents.
    expect(priceCall?.body['unit_amount']).toBe('500');
    expect(priceCall?.body['metadata[purpose]']).toBe('discovery');
    expect(JSON.stringify(created)).not.toContain('1000');
    expect(JSON.stringify(created)).not.toContain('SELLER_LINK');
  });

  it('is idempotent: existing product with bound link → returns it unchanged, creates nothing', async () => {
    const name = discoveryProductName({ repository: 'seller/project', release: 'v2.4.1' });
    const impl = async (url: string) => {
      const path = url.replace('https://api.stripe.com/v1/', '');
      if (path.startsWith('products/search')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [{
              id: 'prod_existing',
              metadata: {
                discovery_payment_link_id: 'plink_1',
                discovery_price_id: 'price_1',
                discovery_payment_link_url: 'https://buy.stripe.com/discovery',
              },
              // SAFETY: name travels outside the double's typed shape.
              name,
            }],
          }),
        };
      }
      throw new Error(`unexpected call: ${path}`);
    };
    const record = await ensureDiscoveryLink({
      apiKey: 'sk_test_listing',
      input: { repository: 'seller/project', release: 'v2.4.1', amount: 5, currency: 'USD', baseUrl: 'x' },
      fetchImpl: impl,
    });
    expect(record.payment_link_id).toBe('plink_1');
    expect(record.product_id).toBe('prod_existing');
  });
});

describe('registry immutability (§15)', () => {
  const base: ListingRecord = {
    schema: 'reposell-listing-record/v1',
    product: { repository: 'seller/project', release: 'v1.0' },
    seller: { sell_url: 'https://seller.example/sell', payment_link: 'https://buy.stripe.com/SELLER' },
    listing: {
      discovery_price: { amount: 5, currency: 'USD' },
      stripe: { payment_link_id: 'plink_1', price_id: 'price_1', product_id: 'prod_1' },
    },
  };

  it('appends new records', () => {
    const next = appendRecord([], base);
    expect(next).toHaveLength(1);
  });

  it('identical re-append is a no-op', () => {
    const once = appendRecord([], base);
    expect(appendRecord(once, base)).toHaveLength(1);
  });

  it('§15 negative: replacing an existing discovery link throws', () => {
    const once = appendRecord([], base);
    const mutated: ListingRecord = {
      ...base,
      listing: { ...base.listing, stripe: { ...base.listing.stripe, payment_link_id: 'plink_2' } },
    };
    expect(() => appendRecord(once, mutated)).toThrow(ImmutabilityError);
  });
});
