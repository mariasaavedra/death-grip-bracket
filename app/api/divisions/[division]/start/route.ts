import { expectedVersion, mutation } from '../../../../../lib/api.ts';
import { startDivision } from '../../../../../lib/tournament/service.ts';

export async function POST(req: Request, { params }: { params: Promise<{ division: string }> }) {
  const { division } = await params;
  return mutation(req, (b, db) => startDivision(db, division, expectedVersion(b)));
}
