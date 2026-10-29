import { adminJson } from '../../../../lib/api.ts';
import { getContacts } from '../../../../lib/tournament/registration.ts';
import { assertDivision } from '../../../../lib/tournament/service.ts';

/** Admin only: first name, phone and initials collected at sign-up, keyed by competitor id. */
export async function GET(req: Request, { params }: { params: Promise<{ division: string }> }) {
  const { division } = await params;
  return adminJson(req, (_body, db) => getContacts(db, assertDivision(division)));
}
