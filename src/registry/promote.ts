/**
 * Registry promotion (spec §8, D13): converts a VERIFIED Listing PR payload
 * into a canonical registry record after merge.
 *
 * INVARIANTS:
 * - Only payloads that passed CI verification reach this code (post-merge).
 * - Promotion is fail-closed: any schema deviation aborts the sync.
 * - Immutability (§15): an existing record for the same repository@release
 *   is never overwritten — promotion refuses instead.
 */

import { REGISTRY_SCHEMA, type ListingRecord } from './records.js';

export const PR_SCHEMA = 'reposell-listing/v1';

export class PromotionError extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = 'PromotionError';
  }
}

interface RawPayload {
  schema?: unknown;
  repository?: { url?: unknown; owner?: unknown; name?: unknown };
  release?: { version?: unknown; commit?: unknown };
  sell?: { url?: unknown; payment_link?: unknown };
  listing?: { discovery_price?: { amount?: unknown; currency?: unknown } };
}

function text(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/** Derives the deterministic canonical filename for a repository slug ("owner/name"). */
export function canonicalFileName(repositorySlug: string): string {
  return `${repositorySlug.replace('/', '--')}.json`;
}

/** A freshly promoted record: immutable facts set, Stripe ids pending. */
export interface PendingListingRecord extends Omit<ListingRecord, 'listing'> {
  listing: Omit<ListingRecord['listing'], 'stripe'>;
}

/**
 * Validates a merged PR payload fail-closed and returns the canonical
 * registry record. Throws PromotionError on ANY deviation.
 */
export function promotePrPayload(pr: unknown): PendingListingRecord {
  const payload = pr as RawPayload | null;
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new PromotionError('payload is not a JSON object');
  }
  if (payload.schema !== PR_SCHEMA) {
    throw new PromotionError(`expected schema ${PR_SCHEMA}`);
  }
  if (!text(payload.repository?.owner) || !text(payload.repository?.name)) {
    throw new PromotionError('repository.owner/name missing');
  }
  if (!text(payload.release?.version)) {
    throw new PromotionError('release.version missing');
  }
  if (!text(payload.sell?.url) || !text(payload.sell?.payment_link)) {
    throw new PromotionError('sell.url/payment_link missing');
  }
  const price = payload.listing?.discovery_price;
  if (
    typeof price?.amount !== 'number' ||
    price.amount <= 0 ||
    !text(price.currency) ||
    price.currency.length !== 3
  ) {
    throw new PromotionError('listing.discovery_price missing or invalid');
  }

  const commit = payload.release.commit;
  return {
    schema: REGISTRY_SCHEMA,
    product: {
      repository: `${payload.repository.owner}/${payload.repository.name}`,
      release: String(payload.release.version),
      ...(text(commit) ? { commit: String(commit) } : {}),
    },
    seller: {
      sell_url: String(payload.sell.url),
      payment_link: String(payload.sell.payment_link),
    },
    listing: {
      discovery_price: { amount: price.amount, currency: String(price.currency) },
    },
  };
}
