import { ADMIN_PIN, createSessionToken, pinMatches, sessionCookie } from '../../../lib/auth.ts';
import { errorResponse, readBody } from '../../../lib/api.ts';
import { ApiError } from '../../../lib/tournament/types.ts';

export async function POST(req: Request) {
  try {
    const body = await readBody(req);
    if (!pinMatches(body.pin, ADMIN_PIN)) throw new ApiError(401, 'Incorrect PIN');
    return Response.json({ ok: true }, { headers: { 'Set-Cookie': sessionCookie(await createSessionToken(ADMIN_PIN)) } });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE() {
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': sessionCookie('', 0) } });
}
