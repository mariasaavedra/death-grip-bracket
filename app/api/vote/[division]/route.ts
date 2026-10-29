import { adminJson, errorResponse, getDb, isAdmin, voterIdFrom } from '../../../../lib/api.ts';
import { assertDivision } from '../../../../lib/tournament/service.ts';
import { clearVotes, getVoteInfo, setVotingStatus } from '../../../../lib/tournament/votes.ts';
import type { VotingStatus } from '../../../../lib/tournament/votes.ts';

type Ctx = { params: Promise<{ division: string }> };

export const dynamic = 'force-dynamic';

/** Public: ballot, status and your own vote. Counts only if the director revealed them (or admin). */
export async function GET(req: Request, { params }: Ctx) {
  try {
    const division = assertDivision((await params).division);
    const info = await getVoteInfo(getDb(), division, { voterId: voterIdFrom(req), isAdmin: await isAdmin(req.headers.get('cookie')) });
    return Response.json(info, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return errorResponse(e);
  }
}

/** Admin: open or close voting. */
export async function PATCH(req: Request, { params }: Ctx) {
  const { division: raw } = await params;
  return adminJson(req, async (body, db) => {
    const division = assertDivision(raw);
    await setVotingStatus(db, division, body.status as VotingStatus);
    return getVoteInfo(db, division, { isAdmin: true });
  });
}

/** Admin: clear all ballots for the division. */
export async function DELETE(req: Request, { params }: Ctx) {
  const { division: raw } = await params;
  return adminJson(req, async (_body, db) => {
    const division = assertDivision(raw);
    await clearVotes(db, division);
    return getVoteInfo(db, division, { isAdmin: true });
  });
}
