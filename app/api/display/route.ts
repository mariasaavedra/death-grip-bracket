import { expectedVersion, mutation } from '../../../lib/api.ts';
import { setDisplay } from '../../../lib/tournament/service.ts';

export function PATCH(req: Request) {
  return mutation(req, (b, db) => setDisplay(db, { division: b.division, mode: b.mode, matchId: b.matchId, expectedVersion: expectedVersion(b) }));
}
