import { expectedVersion, mutation } from '../../../lib/api.ts';
import { registerCompetitor } from '../../../lib/tournament/service.ts';

export function POST(req: Request) {
  return mutation(req, (b, db) =>
    registerCompetitor(db, { division: b.division, name: b.name, status: b.status ?? 'active', expectedVersion: expectedVersion(b) }),
  );
}
