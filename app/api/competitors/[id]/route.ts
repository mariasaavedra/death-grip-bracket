import { expectedVersion, mutation } from '../../../../lib/api.ts';
import { removeCompetitor, updateCompetitor } from '../../../../lib/tournament/service.ts';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  return mutation(req, (b, db) => updateCompetitor(db, id, { name: b.name, status: b.status, expectedVersion: expectedVersion(b) }));
}

export async function DELETE(req: Request, { params }: Ctx) {
  const { id } = await params;
  return mutation(req, (b, db) => removeCompetitor(db, id, expectedVersion(b)));
}
