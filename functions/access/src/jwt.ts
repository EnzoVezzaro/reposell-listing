/**
 * Stateless access-token (JWT) verification for WorkOS AuthKit sessions.
 *
 * WorkOS access tokens are RS256 JWTs signed by the WorkOS JWKS
 * (https://api.workos.com/sso/jwks/). We verify the signature with Web Crypto
 * (RSA verify) — no `jose` dependency, works on Cloudflare Workers. The JWKS
 * is cached in KV to limit upstream fetches.
 *
 * Claims we use (see https://workos.com/docs/authkit/sessions):
 *   sub — WorkOS user id; sid — WorkOS session id; exp — expiry.
 */

import type { AccessEnv } from './workos.js';

const JWKS_KEY = 'workos-jwks';
const JWKS_TTL = 900; // 15 minutes
const MAX_SKEW_MS = 60_000;

interface Jwks {
  keys: { kid?: string; kty?: string; n?: string; e?: string; alg?: string }[];
}

interface TokenClaims {
  sub: string;
  sid?: string;
  exp?: number;
  iss?: string;
}

function b64urlDecode(input: string): Uint8Array {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, '=');
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function b64urlJson(input: string): unknown {
  const bytes = b64urlDecode(input);
  return JSON.parse(new TextDecoder().decode(bytes));
}

async function getJwks(env: AccessEnv): Promise<Jwks> {
  const cached = await env.KV.get<Jwks>(JWKS_KEY, 'json').catch(() => null);
  if (cached?.keys?.length) return cached;

  const res = await fetch('https://api.workos.com/sso/jwks/');
  if (!res.ok) throw new Error(`Failed to fetch WorkOS JWKS (HTTP ${res.status}).`);
  const jwks = (await res.json()) as Jwks;

  await env.KV.put(JWKS_KEY, JSON.stringify(jwks), { expirationTtl: JWKS_TTL }).catch(() => {});
  return jwks;
}

async function verifySignature(env: AccessEnv, token: string): Promise<TokenClaims | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const header = (() => {
    try {
      return (b64urlJson(parts[0]) as { alg?: string; kid?: string; kty?: string });
    } catch {
      return {};
    }
  })();
  if (header.alg?.toUpperCase() !== 'RS256') return null;

  const jwks = await getJwks(env);
  const key = jwks.keys.find((k) => k.kid === header.kid && k.n && k.e);
  if (!key) return null;

  const publicKey = await crypto.subtle.importKey(
    'jwk',
    { kty: 'RSA', n: key.n!, e: key.e!, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  const signingInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const signature = b64urlDecode(parts[2]);
  const valid = await crypto.subtle.verify({ name: 'RSASSA-PKCS1-v1_5' }, publicKey, signature, signingInput);
  if (!valid) return null;

  let claims: TokenClaims;
  try {
    claims = b64urlJson(parts[1]) as TokenClaims;
  } catch {
    return null;
  }

  const expMs = claims.exp ? claims.exp * 1000 : 0;
  if (expMs !== 0 && expMs < Date.now() - MAX_SKEW_MS) return null;
  if (!claims.sub) return null;

  return claims;
}

/**
 * Verifies a WorkOS access token. Returns { userId, sessionId } or null.
 */
export async function verifyAccessToken(
  env: AccessEnv,
  token: string,
): Promise<{ userId: string; sessionId: string } | null> {
  if (!token) return null;
  let claims: TokenClaims | null;
  try {
    claims = await verifySignature(env, token);
  } catch {
    return null;
  }
  if (!claims) return null;
  return { userId: claims.sub, sessionId: claims.sid ?? '' };
}