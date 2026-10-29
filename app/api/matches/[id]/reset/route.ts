import { expectedVersion, mutation, numericId } from '../../../../../lib/api.ts';
import { resetMatch } from '../../../../../lib/tournament/service.ts';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return mutation(req, (b, db) => resetMatch(db, numericId(id), expectedVersion(b)));
}
