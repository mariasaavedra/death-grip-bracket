import { errorResponse, getDb, readBody, voterCookie, voterIdFrom } from '../../../lib/api.ts';
import { assertDivision } from '../../../lib/tournament/service.ts';
import { castVote, getVoteInfo } from '../../../lib/tournament/votes.ts';

/** Public (the one unauthenticated write): cast or change your vote. Identified by a simple cookie. */
export async function POST(req: Request) {
  try {
    const body = await readBody(req);
    const division = assertDivision(body.division);
    const existing = voterIdFrom(req);
    const voterId = existing ?? crypto.randomUUID();
    await castVote(getDb(), division, voterId, body.competitorId);
    const info = await getVoteInfo(getDb(), division, { voterId, isAdmin: false });
    return Response.json(info, { headers: { 'Cache-Control': 'no-store', ...(existing ? {} : { 'Set-Cookie': voterCookie(voterId) }) } });
  } catch (e) {
    return errorResponse(e);
  }
}
