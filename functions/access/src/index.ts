/**
 * reposell listing access worker — index
 *
 * WorkOS AuthKit (GitHub provider) + discovery-access processing.
 *
 * Routes:
 *   GET  /api/auth/login     → redirect to WorkOS hosted AuthKit (GitHub)
 *   GET  /api/auth/callback  → exchange code, set HttpOnly session cookie, redirect back
 *   GET  /api/auth/me        → current user (or 401)
 *   POST /api/auth/logout    → revoke WorkOS session + clear cookie
 *   POST /api/access/contribute → validate a paid discovery session + record access
 *   GET  /api/access/status  → does this user have access to this listing?
 *
 * Depends on bindings: D1 `DATABASE` (contributions ledger), KV (OAuth state
 * + JWKS cache), and secrets:
 *   WORKOS_CLIENT_ID, WORKOS_API_KEY, WORKOS_REDIRECT_URI,
 *   LISTING_STRIPE_SECRET_KEY (RepoSell's own Stripe), ALLOWED_ORIGINS.
 */

import { claimContribution, accessStatus, json } from './access.js';
import { readCookie, SESSION_COOKIE, sessionCookie, clearSessionCookie, cookieSecure } from './cookies.js';
import { verifyAccessToken } from './jwt.js';
import {
  authorizeUrl,
  exchangeCode,
  getProfile,
  signOutUrl,
  githubLogin,
  type AccessEnv,
  type WorkOSUser,
} from './workos.js';

const STATE_TTL = 600; // seconds
const LOGIN_DEFAULT_REDIRECT = 'https://listing.reposell.dev/';

interface OAuthState {
  redirect_uri: string;
  code_verifier: string;
  created_at: number;
}

function allowedOrigins(env: AccessEnv): string[] {
  return env.ALLOWED_ORIGINS
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

function originAllowed(env: AccessEnv, origin: string): boolean {
  if (!origin) return false;
  return allowedOrigins(env).some((o) => o === origin.replace(/\/+$/, ''));
}

function corsHeaders(env: AccessEnv, request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') ?? '';
  const allow = originAllowed(env, origin) ? origin : '';
  const headers: Record<string, string> = { Vary: 'Origin' };
  if (allow) {
    headers['Access-Control-Allow-Origin'] = allow;
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    headers['Access-Control-Max-Age'] = '86400';
  }
  return headers;
}

function b64url(bytes: Uint8Array): string {
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomB64(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return b64url(buf);
}

async function generatePkce(): Promise<{ verifier: string; challenge: string }> {
  const verifier = randomB64(48); // 64 chars
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = b64url(new Uint8Array(digest));
  return { verifier, challenge };
}

/** Reads the session cookie + verifies the WorkOS JWT. */
async function requireSession(
  env: AccessEnv,
  request: Request,
): Promise<{ ok: false; response: Response } | { ok: true; userId: string; sessionId: string; profile: WorkOSUser }> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return { ok: false, response: json({ error: 'Not authenticated' }, 401, corsHeaders(env, request)) };

  const verified = await verifyAccessToken(env, token);
  if (!verified) {
    return {
      ok: false,
      response: json({ error: 'Session expired', code: 'session_expired' }, 401, {
        ...corsHeaders(env, request),
        'Set-Cookie': clearSessionCookie(),
      }),
    };
  }

  let profile: WorkOSUser;
  try {
    profile = await getProfile(env, verified.userId);
  } catch {
    return { ok: false, response: json({ error: 'Not authenticated' }, 401, corsHeaders(env, request)) };
  }

  return { ok: true, userId: verified.userId, sessionId: verified.sessionId, profile };
}

function publicUser(user: WorkOSUser): { id: string; email: string; github_login: string; name: string } {
  return {
    id: user.id,
    email: user.email,
    github_login: githubLogin(user),
    name: user.name ?? user.first_name ?? '',
  };
}

async function handleLogin(env: AccessEnv, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const redirectUri =
    url.searchParams.get('redirect_uri')?.trim() || '';

  let target = redirectUri;
  if (target) {
    try {
      const parsed = new URL(target);
      if (!originAllowed(env, `${parsed.origin}/`)) target = '';
    } catch {
      target = '';
    }
  }
  if (!target) target = LOGIN_DEFAULT_REDIRECT;

  const { verifier, challenge } = await generatePkce();
  const state = randomB64(24);

  const oauthState: OAuthState = { redirect_uri: target, code_verifier: verifier, created_at: Date.now() };
  await env.KV.put(`oauth_state:${state}`, JSON.stringify(oauthState), { expirationTtl: STATE_TTL }).catch(() => {});

  return Response.redirect(authorizeUrl(env, { state, codeChallenge: challenge }), 302);
}

async function handleCallback(env: AccessEnv, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const state = url.searchParams.get('state') ?? '';
  const code = url.searchParams.get('code') ?? '';
  const error = url.searchParams.get('error');

  if (error) return json({ error: `Auth failed: ${error}` }, 400);
  if (!state || !code) return json({ error: 'Missing state or code' }, 400);

  const stored = await env.KV.get<OAuthState>(`oauth_state:${state}`, 'json').catch(() => null);
  const redirectUri = stored?.redirect_uri ?? '';

  if (!stored?.code_verifier) return json({ error: 'Invalid or expired login state' }, 400);

  let session;
  try {
    session = await exchangeCode(env, { code, codeVerifier: stored.code_verifier });
  } catch (e) {
    return json({ error: (e as Error).message }, 401);
  }

  await env.KV.delete(`oauth_state:${state}`).catch(() => {});

  const headers: Record<string, string> = {
    Location: redirectUri || LOGIN_DEFAULT_REDIRECT,
    'Set-Cookie': sessionCookie(session.access_token, cookieSecure(env)),
  };
  return new Response(null, { status: 302, headers });
}

async function handleMe(env: AccessEnv, request: Request): Promise<Response> {
  const who = await requireSession(env, request);
  if (!who.ok) return who.response;
  return json({ authenticated: true, user: publicUser(who.profile) }, 200, corsHeaders(env, request));
}

async function handleLogout(env: AccessEnv, request: Request): Promise<Response> {
  const who = await requireSession(env, request);
  let logoutUrl = '';
  if (who.ok && who.sessionId) {
    logoutUrl = await signOutUrl(env, who.sessionId).catch(() => '');
  }
  return json(
    { ok: true, logout_url: logoutUrl },
    200,
    { ...corsHeaders(env, request), 'Set-Cookie': clearSessionCookie() },
  );
}

async function handleContribute(env: AccessEnv, request: Request): Promise<Response> {
  const who = await requireSession(env, request);
  if (!who.ok) return who.response;

  const headers = corsHeaders(env, request);
  if (request.headers.get('Origin') && !originAllowed(env, request.headers.get('Origin')!)) {
    return json({ error: 'Origin not allowed' }, 403, headers);
  }

  let body: { listing_id?: string; checkout_session_id?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400, headers);
  }

  const result = await claimContribution(env, {
    listing_id: body.listing_id ?? '',
    checkout_session_id: body.checkout_session_id ?? '',
    user_id: who.userId,
    user_email: who.profile.email ?? '',
    github_login: githubLogin(who.profile),
  });

  if (!result.ok) return json({ error: result.reason }, 400, headers);
  return json({ ok: true }, 200, headers);
}

async function handleStatus(env: AccessEnv, request: Request): Promise<Response> {
  const who = await requireSession(env, request);
  if (!who.ok) return who.response;

  const listingId = new URL(request.url).searchParams.get('listing_id') ?? '';
  const status = await accessStatus(env, listingId, who.userId);
  return json(
    {
      authenticated: true,
      user: publicUser(who.profile),
      ...status,
    },
    200,
    corsHeaders(env, request),
  );
}

export default {
  async fetch(request: Request, env: AccessEnv): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env, request) });
    }

    switch (path) {
      case '/api/auth/login':
        return handleLogin(env, request);
      case '/api/auth/callback':
        return handleCallback(env, request);
      case '/api/auth/me':
        if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405, corsHeaders(env, request));
        return handleMe(env, request);
      case '/api/auth/logout':
        if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, corsHeaders(env, request));
        return handleLogout(env, request);
      case '/api/access/contribute':
        if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, corsHeaders(env, request));
        return handleContribute(env, request);
      case '/api/access/status':
        if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405, corsHeaders(env, request));
        return handleStatus(env, request);
      default:
        return json({ error: 'Not found' }, 404, corsHeaders(env, request));
    }
  },
};