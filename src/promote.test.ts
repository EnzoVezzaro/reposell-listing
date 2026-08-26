import { describe, expect, it } from 'vitest';

import { canonicalFileName, promotePrPayload, PromotionError } from './registry/promote.js';
import { REGISTRY_SCHEMA } from './registry/records.js';
import type { PrPayload } from '../verify/pipeline.js';

const payload: PrPayload = {
  schema: 'reposell-listing/v1',
  repository: { url: 'https://github.com/seller/project', owner: 'seller', name: 'project' },
  release: { version: 'v2.4.1', commit: '8f92a1' },
  sell: { url: 'https://seller.example/sell', payment_link: 'https://buy.stripe.com/SELLER_LINK' },
  listing: { discovery_price: { amount: 5, currency: 'USD' } },
};

describe('promotePrPayload (post-merge registry promotion)', () => {
  it('promotes a verified payload into a pending canonical record', () => {
    const record = promotePrPayload(payload);
    expect(record.schema).toBe(REGISTRY_SCHEMA);
    expect(record.product).toEqual({ repository: 'seller/project', release: 'v2.4.1', commit: '8f92a1' });
    expect(record.seller).toEqual({
      sell_url: 'https://seller.example/sell',
      payment_link: 'https://buy.stripe.com/SELLER_LINK',
    });
    expect(record.listing.discovery_price).toEqual({ amount: 5, currency: 'USD' });
  });

  it('omits commit when the payload has none', () => {
    const record = promotePrPayload({ ...payload, release: { version: 'v1.0.0' } });
    expect(record.product.commit).toBeUndefined();
  });

  it('fail-closed: non-object payload throws', () => {
    expect(() => promotePrPayload('nope')).toThrow(PromotionError);
    expect(() => promotePrPayload(null)).toThrow(PromotionError);
  });

  it.each([
    ['wrong schema', { ...payload, schema: 'other/v1' }],
    ['missing owner', { ...payload, repository: { ...payload.repository, owner: '' } }],
    ['missing version', { ...payload, release: { version: '' } }],
    ['missing seller link', { ...payload, sell: { url: 'https://x', payment_link: '' } }],
    [
      'bad discovery price',
      { ...payload, listing: { discovery_price: { amount: -1, currency: 'USD' } } },
    ],
    [
      'bad currency',
      { ...payload, listing: { discovery_price: { amount: 5, currency: 'dollars' } } },
    ],
  ])('fail-closed: %s throws', (_label, bad) => {
    expect(() => promotePrPayload(bad)).toThrow(PromotionError);
  });

  it('canonical filename is deterministic per repository', () => {
    expect(canonicalFileName('seller/project')).toBe('seller--project.json');
  });
});
