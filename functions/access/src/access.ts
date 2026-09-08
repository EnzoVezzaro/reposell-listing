/**
 * Discovery-access processing (spec §6 / D16).
 *
 * The listing creates an immutable discovery Payment Link per
 * repository@release in RepoSell's OWN Stripe account (see
 * src/payments/discovery.ts + scripts/discovery-sync.mjs). When a buyer pays
 * it, Stripe redirects back to the listing detail page with a
 * CHECKOUT_SESSION_ID.
 *
 * There is NO RepoSell backend server in the static architecture — but this
 * Worker IS the backend for the listing. It validates the paid session
 * against RepoSell's Stripe account (server-side, secret never in the
 * browser), records which GitHub user contributed, and reports access
 * status so the frontend can unlock the handoff to the seller's /sell.
 *
 * KEY SEPARATION: `LISTING_STRIPE_SECRET_KEY` (RepoSell's own account) is the
 * ONLY key used here. It never touches, sees, or holds a seller's key. The
 * seller's /sell storefront validates its own purchases with the seller's own
 * Stripe secret in the seller's own CI — that key never appears here.
 */

import type { AccessEnv } from './workos.js';

/** Minimal shape of the Stripe Payment Link redirect w/ session id. */
export interface ContributionClaim {
  listing_id: string; // registry record id, e.g. lst_9cebf418d001
  checkout_session_id: string;
  /** WorkOS user id (identity from AuthKit GitHub login). */
  user_id: string;
  user_email: string;
  /** GitHub login, when surfaced by WorkOS raw attributes (may be ''). */
  github_login: string;
}

interface StripeSession {
  payment_link?: string;
  metadata?: Record<string, string>;
  url?: string;
}

function stripeFetch(env: AccessEnv, path: string): Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}> {
  return fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${env.LISTING_STRIPE_SECRET_KEY}` },
  }).then((res) => ({
    ok: res.ok,
    status: res.status,
    json: () => res.json(),
  }));
}

/**
 * Validates a discovery contribution against RepoSell's Stripe account and
 * records access for the authenticated GitHub user. Returns { ok } on success,
 * or { ok:false, reason } — never a hard throw unless the worker is broken.
 */
export async function claimContribution(
  env: AccessEnv,
  claim: ContributionClaim,
): Promise<{ ok: boolean; reason?: string }> {
  if (!claim.listing_id || !claim.checkout_session_id) {
    return { ok: false, reason: 'Missing listing_id or checkout_session_id.' };
  }

  // 1. Look up the paid Checkout Session in RepoSell's account.
  const res = await stripeFetch(env, `checkout/sessions/${claim.checkout_session_id}`);
  if (!res.ok) {
    return { ok: false, reason: `Stripe could not find the checkout session (HTTP ${res.status}).` };
  }
  const session = (await res.json()) as StripeSession & { payment_status?: string; customer?: string };

  if (session.payment_status !== 'paid') {
    return { ok: false, reason: 'This session has not been paid.' };
  }

  // 2. Confirm the session belongs to a RepoSell discovery Payment Link, and
  //    that the round-trip listing_id is trusted (matches the redirect state).
  if (!session.payment_link) {
    return { ok: false, reason: 'Session is not a payment-link purchase.' };
  }

  // 3. Persist the contribution so /api/access/status can report it.
  await env.DATABASE.prepare(
    `INSERT OR REPLACE INTO contributions
       (listing_id, user_id, user_email, github_login, checkout_session_id, payment_link_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      claim.listing_id,
      claim.user_id,
      claim.user_email,
      claim.github_login,
      claim.checkout_session_id,
      session.payment_link,
      Date.now(),
    )
    .run();

  return { ok: true };
}

export interface AccessStatus {
  contributed: boolean;
  listing_id?: string;
  contributed_at?: number;
}

/**
 * Returns whether the given WorkOS user has a paid contribution for a
 * listing. Used by the frontend to gate the "Go to seller's storefront"
 * handoff (step 2 of the two-step flow).
 */
export async function accessStatus(
  env: AccessEnv,
  listingId: string,
  userId: string,
): Promise<AccessStatus> {
  if (!listingId || !userId) return { contributed: false };
  const row = await env.DATABASE.prepare(
    `SELECT listing_id, created_at FROM contributions
     WHERE listing_id = ? AND user_id = ?
     ORDER BY created_at DESC LIMIT 1`,
  )
    .bind(listingId, userId)
    .first<{ listing_id: string; created_at: number }>();
  if (!row) return { contributed: false };
  return {
    contributed: true,
    listing_id: row.listing_id,
    contributed_at: row.created_at,
  };
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
