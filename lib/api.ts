import { env } from 'cloudflare:workers';
import { ADMIN_PIN, readCookie, SESSION_COOKIE, verifySessionToken } from './auth.ts';
import { ApiError } from './tournament/types.ts';
import { isVoterId } from './tournament/votes.ts';
import type { TournamentState } from './tournament/types.ts';

export function getDb(): D1Database {
  return env.DB;
}

export async function isAdmin(cookieHeader: string | null | undefined): Promise<boolean> {
  return verifySessionToken(readCookie(cookieHeader, SESSION_COOKIE), ADMIN_PIN);
}

const NO_STORE = { 'Cache-Control': 'no-store' };

export function stateResponse(state: TournamentState): Response {
  const { version, updatedAt, brackets, app } = state;
  return Response.json({ version, updatedAt, brackets, app }, { headers: NO_STORE });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) return Response.json({ error: { code: error.status, message: error.message } }, { status: error.status, headers: NO_STORE });
  if (error instanceof SyntaxError) return Response.json({ error: { code: 400, message: 'Invalid JSON body' } }, { status: 400, headers: NO_STORE });
  console.error(error);
  return Response.json({ error: { code: 500, message: 'Unexpected server error' } }, { status: 500, headers: NO_STORE });
}

export async function readBody(req: Request): Promise<Record<string, unknown>> {
  const body = await req.json();
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ApiError(400, 'Request body must be a JSON object');
  return body as Record<string, unknown>;
}

export function expectedVersion(body: Record<string, unknown>): number {
  if (!Number.isInteger(body.expectedVersion)) throw new ApiError(400, 'expectedVersion is required');
  return body.expectedVersion as number;
}

export function numericId(value: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) throw new ApiError(400, 'Invalid id');
  return n;
}

/** Wraps a mutation handler: admin check, JSON body, consistent errors. */
export async function mutation(
  req: Request,
  run: (body: Record<string, unknown>, db: D1Database) => Promise<TournamentState>,
): Promise<Response> {
  try {
    if (!(await isAdmin(req.headers.get('cookie')))) throw new ApiError(401, 'Unauthorized');
    return stateResponse(await run(await readBody(req), getDb()));
  } catch (e) {
    return errorResponse(e);
  }
}

export const VOTER_COOKIE = 'dg_voter';

export function voterIdFrom(req: Request): string | null {
  const id = readCookie(req.headers.get('cookie'), VOTER_COOKIE);
  return isVoterId(id) ? id : null;
}

export function voterCookie(id: string): string {
  return `${VOTER_COOKIE}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${3 * 24 * 60 * 60}`;
}

/** Admin-only handler for endpoints that don't return tournament state (voting controls). */
export async function adminJson(
  req: Request,
  run: (body: Record<string, unknown>, db: D1Database) => Promise<unknown>,
): Promise<Response> {
  try {
    if (!(await isAdmin(req.headers.get('cookie')))) throw new ApiError(401, 'Unauthorized');
    const body = req.method === 'DELETE' ? {} : await readBody(req);
    return Response.json(await run(body, getDb()), { headers: NO_STORE });
  } catch (e) {
    return errorResponse(e);
  }
}
