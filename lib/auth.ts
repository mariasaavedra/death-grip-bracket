// Server-only (never imported by client components). Change this before the event.
export const ADMIN_PIN = '1234';
export const SESSION_COOKIE = 'dg_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

async function hmac(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(`dg-session:${secret}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function pinMatches(input: unknown, secret: string | undefined): boolean {
  return !!secret && typeof input === 'string' && safeEqual(input, secret);
}

export async function createSessionToken(secret: string, now = Date.now()): Promise<string> {
  const expires = String(now + SESSION_TTL_MS);
  return `${expires}.${await hmac(expires, secret)}`;
}

export async function verifySessionToken(token: string | undefined, secret: string | undefined, now = Date.now()): Promise<boolean> {
  if (!token || !secret) return false;
  const [expires, sig] = token.split('.');
  if (!expires || !sig || Number(expires) < now) return false;
  return safeEqual(sig, await hmac(expires, secret));
}

export function readCookie(header: string | null | undefined, name: string): string | undefined {
  return header
    ?.split(';')
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export function sessionCookie(token: string, maxAgeSeconds = SESSION_TTL_MS / 1000): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}`;
}
