/**
 * Listing registry records (spec §8, §15, §16): immutable per-release
 * commercial records for the discovery side.
 *
 * INVARIANTS:
 * - Appending a new repository@release record is allowed.
 * - An EXISTING record's discovery link can never be changed or removed
 *   (§15: old links remain valid forever). Attempts throw.
 */

export const REGISTRY_SCHEMA = 'reposell-listing-record/v1';

export interface ListingRecord {
  schema: typeof REGISTRY_SCHEMA;
  product: { repository: string; release: string; commit?: string };
  seller: { sell_url: string; payment_link: string };
  listing: {
    discovery_price: { amount: number; currency: string };
    stripe: { payment_link_id: string; price_id: string; product_id: string };
  };
  /** README markdown — fetched by the CLI from the seller's repo during publish. */
  readme?: string;
}

export class ImmutabilityError extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = 'ImmutabilityError';
  }
}

export function recordKey(repository: string, release: string): string {
  return `${repository}@${release}`;
}

/**
 * Appends a record. Throws ImmutabilityError when a record for the same
 * repository@release already exists with a DIFFERENT discovery link —
 * history stays verifiable, links are never replaced (§15).
 */
export function appendRecord(
  existing: ListingRecord[],
  record: ListingRecord,
): ListingRecord[] {
  const key = recordKey(record.product.repository, record.product.release);
  const previous = existing.find(
    (entry) => recordKey(entry.product.repository, entry.product.release) === key,
  );
  if (previous !== undefined) {
    if (previous.listing.stripe.payment_link_id !== record.listing.stripe.payment_link_id) {
      throw new ImmutabilityError(
        `${key} already has discovery link ${previous.listing.stripe.payment_link_id}; ` +
          `refusing to replace with ${record.listing.stripe.payment_link_id} (§15: links are immutable)`,
      );
    }
    return existing; // identical re-append is a no-op (idempotent CI)
  }
  return [...existing, record];
}
