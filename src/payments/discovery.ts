/**
 * Listing Stripe automation (spec §6, D16): creates the Listing's OWN
 * Product / Price / Payment Link for DISCOVERY access.
 *
 * INVARIANTS:
 * - The input type has no seller fields. A seller price or link structurally
 *   cannot enter a discovery transaction.
 * - Idempotent: deterministic Product name + metadata key; CI searches
 *   before creating (safe double-runs).
 * - Immutable per release (§15/D16): once a link exists for
 *   repository@release, this module returns it unchanged — never replaces.
 * - Secret key arrives per-call from the CI environment (§17) and is never
 *   persisted, logged, or embedded in outputs.
 */

export interface DiscoveryLinkInput {
  repository: string;
  release: string;
  amount: number;
  currency: string;
  baseUrl: string;
}

export interface DiscoveryLinkRecord {
  payment_link_id: string;
  price_id: string;
  product_id: string;
  payment_link_url: string;
}

export interface StripeFetchLike {
  (url: string, init: { method: string; headers: Record<string, string>; body?: string }): Promise<{
    ok: boolean;
    status: number;
    json: () => Promise<unknown>;
  }>;
}

export class DiscoverySecretError extends Error {
  constructor() {
    super('LISTING_STRIPE_SECRET_KEY missing — discovery link automation unavailable');
    this.name = 'DiscoverySecretError';
  }
}

interface StripeMetadata {
  discovery_payment_link_id?: string;
  discovery_price_id?: string;
  discovery_payment_link_url?: string;
}

interface StripeObject {
  id?: string;
  url?: string;
  active?: boolean;
  metadata?: StripeMetadata;
  data?: Array<{ id: string; url?: string; metadata?: StripeMetadata }>;
}

function formEncode(fields: Record<string, string>): string {
  return Object.entries(fields)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

async function stripeRequest(
  fetchImpl: StripeFetchLike,
  apiKey: string,
  method: 'GET' | 'POST',
  path: string,
  body?: Record<string, string>,
): Promise<StripeObject> {
  const res = await fetchImpl(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    ...(body !== undefined ? { body: formEncode(body) } : {}),
  });
  const parsed = (await res.json()) as StripeObject & { error?: { message?: string } };
  if (!res.ok || parsed.error !== undefined) {
    throw new Error(`Stripe ${path} failed: ${parsed.error?.message ?? `HTTP ${res.status}`}`);
  }
  return parsed;
}

function metadataFields(input: DiscoveryLinkInput): Record<string, string> {
  return {
    'metadata[purpose]': 'discovery',
    'metadata[repository]': input.repository,
    'metadata[release]': input.release,
    'metadata[discovery_amount]': input.amount.toFixed(2),
    'metadata[discovery_currency]': input.currency.toLowerCase(),
  };
}

export function discoveryProductName(input: { repository: string; release: string }): string {
  return `reposell discovery — ${input.repository} @ ${input.release}`;
}

/**
 * Creates (or returns the existing) discovery Payment Link for
 * repository@release. Deterministic search first — double CI runs create
 * nothing. Existing links are returned untouched (immutability).
 */
export async function ensureDiscoveryLink(input: {
  apiKey: string;
  input: DiscoveryLinkInput;
  fetchImpl: StripeFetchLike;
}): Promise<DiscoveryLinkRecord> {
  const { input: link, fetchImpl, apiKey } = input;
  const name = discoveryProductName(link);

  // Idempotent search: the deterministic product name IS the key. The
  // product's metadata carries its link ids — an existing discovery link is
  // returned UNCHANGED (§15 immutability, safe double-runs).
  const search = await stripeRequest(fetchImpl, apiKey, 'GET',
    `products/search?query=name:"${encodeURIComponent(name)}"`);
  const existing = search.data?.[0];
  if (existing?.id !== undefined && existing.metadata?.discovery_payment_link_id !== undefined) {
    return {
      payment_link_id: existing.metadata.discovery_payment_link_id,
      price_id: existing.metadata.discovery_price_id ?? 'unknown',
      product_id: existing.id,
      payment_link_url: existing.metadata.discovery_payment_link_url ?? 'unknown',
    };
  }

  // Reuse a product left behind by a partial previous run instead of
  // stacking same-name duplicates. tax_code is required by Managed
  // Payments accounts before a product can enter a Payment Link;
  // txcd_10000000 ("General — Everything Else") is the universal catch-all.
  let productId = existing?.id;
  if (productId === undefined) {
    const created = await stripeRequest(fetchImpl, apiKey, 'POST', 'products', {
      name,
      tax_code: 'txcd_10000000',
      ...metadataFields(link),
    });
    productId = created.id;
  } else {
    // Partial-run leftovers may predate tax_code — backfill before use.
    await stripeRequest(fetchImpl, apiKey, 'POST', `products/${productId}`, {
      tax_code: 'txcd_10000000',
    });
  }
  if (productId === undefined) throw new Error('Stripe product creation returned no id');

  const price = await stripeRequest(fetchImpl, apiKey, 'POST', 'prices', {
    product: productId,
    unit_amount: String(Math.round(link.amount * 100)),
    currency: link.currency.toLowerCase(),
    ...metadataFields(link),
  });
  const priceId = price.id;
  if (priceId === undefined) throw new Error('Stripe price creation returned no id');

  const paymentLink = await stripeRequest(fetchImpl, apiKey, 'POST', 'payment_links', {
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    'after_completion[type]': 'redirect',
    'after_completion[redirect][url]': `${link.baseUrl}/registry/tools/${link.repository.replace('/', '-').toLowerCase()}/`,
    ...metadataFields(link),
  });
  const linkId = paymentLink.id;
  const linkUrl = paymentLink.url;
  if (linkId === undefined || linkUrl === undefined) {
    throw new Error('Stripe payment link creation returned no id/url');
  }

  // Bind the link to the product metadata so future runs are pure lookups.
  await stripeRequest(fetchImpl, apiKey, 'POST', `products/${productId}`, {
    'metadata[discovery_payment_link_id]': linkId,
    'metadata[discovery_price_id]': priceId,
    'metadata[discovery_payment_link_url]': linkUrl,
  });

  return { payment_link_id: linkId, price_id: priceId, product_id: productId, payment_link_url: linkUrl };
}
