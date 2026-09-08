/**
 * WorkOS AuthKit client for the official reposell listing (spec §6 / D16).
 *
 * Replaces better-auth. GitHub login is handled by WorkOS hosted AuthKit via
 * the User Management REST API (no SDK dependency — raw fetch works on
 * Cloudflare Workers and matches the existing github-auth/worker.js pattern).
 *
 * KEY SEPARATION (D8 / §17):
 *  - This worker owns RepoSell's identity concern only (WorkOS API key +
 *    client id, RepoSell's own Stripe secret for discovery contributions).
 *  - It NEVER sees, holds, or validates a seller's key. The seller's /sell
 *    storefront validates its own license purchases with the seller's own
 *    Stripe secret in the seller's own CI.
 */

export interface AccessEnv {
  /** WorkOS client id (test or prod environment). */
  WORKOS_CLIENT_ID: string;
  /** WorkOS API key (test or prod — matches WORKOS_CLIENT_ID). */
  WORKOS_API_KEY: string;
  /** Server-side callback for the AuthKit redirect flow, e.g. https://access.reposell.dev/api/auth/callback */
  WORKOS_REDIRECT_URI: string;
  /** RepoSell's OWN Stripe secret — validates discovery contributions only. */
  LISTING_STRIPE_SECRET_KEY: string;
  /** Comma-separated list of allowed browser origins (listing frontends, seller /sell pages). */
  ALLOWED_ORIGINS: string;
  /** WorkOS API base (defaults to https://api.workos.com). */
  WORKOS_API_BASE?: string;
  /** Whether the session cookie requires Secure (default true; disable for local http dev). */
  COOKIE_SECURE?: string;
  DATABASE: D1Database;
  /** KV: OAuth state (PKCE) + cached JWKS. */
  KV: KVNamespace;
}

const WORKOS_DEFAULT_API = 'https://api.workos.com';

export interface WorkOSUser {
  id: string;
  email: string;
  email_verified: boolean;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  profile_picture_url?: string | null;
  /** Present on provider-auth responses when WorkOS surfaces the raw GitHub profile. */
  raw_attributes?: Record<string, unknown> & { id?: number | string; login?: string };
}

export interface AuthSession {
  user: WorkOSUser;
  access_token: string;
  refresh_token: string;
  organization_id?: string | null;
}

export function workosApi(env: AccessEnv): string {
  return env.WORKOS_API_BASE ?? WORKOS_DEFAULT_API;
}

export function githubLogin(user: WorkOSUser): string {
  const raw = user.raw_attributes;
  return typeof raw?.login === 'string' ? raw.login : '';
}

export function githubUserId(user: WorkOSUser): string {
  const raw = user.raw_attributes;
  return raw?.id !== undefined ? String(raw.id) : '';
}

/** Builds the WorkOS hosted AuthKit authorize URL (GitHub provider). */
export function authorizeUrl(
  env: AccessEnv,
  opts: { state: string; codeChallenge: string; provider?: string },
): string {
  const p = new URLSearchParams({
    client_id: env.WORKOS_CLIENT_ID,
    redirect_uri: env.WORKOS_REDIRECT_URI,
    state: opts.state,
    provider: opts.provider ?? 'github',
    code_challenge: opts.codeChallenge,
    code_challenge_method: 'S256',
    scope: 'openid profile email',
  });
  return `${workosApi(env)}/user_management/authorize?${p.toString()}`;
}

/**
 * Exchanges the AuthKit authorization code for a user session (access token
 * JWT + refresh token). Server-side only — the API key never reaches the
 * browser.
 */
export async function exchangeCode(
  env: AccessEnv,
  opts: { code: string; codeVerifier: string },
): Promise<AuthSession> {
  const res = await fetch(`${workosApi(env)}/user_management/authenticate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.WORKOS_API_KEY}`,
    },
    body: JSON.stringify({
      client_id: env.WORKOS_CLIENT_ID,
      client_secret: env.WORKOS_API_KEY,
      grant_type: 'authorization_code',
      code: opts.code,
      redirect_uri: env.WORKOS_REDIRECT_URI,
      code_verifier: opts.codeVerifier,
    }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; error_description?: string };
    throw new Error(`WorkOS code exchange failed (HTTP ${res.status}): ${body.error_description ?? body.error ?? ''}`);
  }

  const data = (await res.json()) as {
    user: WorkOSUser;
    access_token: string;
    refresh_token: string;
    organization_id?: string | null;
  };

  if (!data.access_token || !data.user?.id) {
    throw new Error('WorkOS code exchange returned no access_token or user.');
  }

  return {
    user: data.user,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    organization_id: data.organization_id ?? null,
  };
}

/** Fetches a fresh profile for a WorkOS user id (server-side, via API key). */
export async function getProfile(env: AccessEnv, userId: string): Promise<WorkOSUser> {
  const res = await fetch(`${workosApi(env)}/user_management/users/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${env.WORKOS_API_KEY}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch WorkOS profile (HTTP ${res.status}).`);
  return (await res.json()) as WorkOSUser;
}

/**
 * Revokes the session at WorkOS and returns the URL to redirect the browser
 * to so the WorkOS-side session also ends.
 */
export async function signOutUrl(env: AccessEnv, sessionId: string): Promise<string> {
  const res = await fetch(`${workosApi(env)}/user_management/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.WORKOS_API_KEY}`,
    },
    body: JSON.stringify({
      client_id: env.WORKOS_CLIENT_ID,
      client_secret: env.WORKOS_API_KEY,
      session_id: sessionId,
    }),
  });
  if (!res.ok) throw new Error(`WorkOS logout failed (HTTP ${res.status}).`);
  const data = (await res.json()) as { url?: string };
  return data.url ?? '';
}