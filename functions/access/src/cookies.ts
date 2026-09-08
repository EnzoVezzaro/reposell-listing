/**
 * HttpOnly session-cookie helpers for the reposell listing access worker.
 *
 * The cookie holds the WorkOS access-token JWT and is scoped to the worker's
 * host (access.reposell.dev). It is Send-Only: the frontend never reads it;
 * it just sends it along on cross-origin requests with `credentials: 'include'`.
 * Cross-site sharing requires SameSite=None + Secure.
 */

export const SESSION_COOKIE = 'reposell_workos_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function readCookie(request: Request, name: string): string {
  const header = request.headers.get('Cookie') ?? '';
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return '';
}

export function sessionCookie(value: string, secure: boolean): string {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(value)}`,
    `Path=/`,
    `Max-Age=${SESSION_MAX_AGE}`,
    `HttpOnly`,
    `SameSite=None`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=None; Secure`;
}

export function cookieSecure(env: { COOKIE_SECURE?: string }): boolean {
  return env.COOKIE_SECURE !== 'false';
}