import { errorResponse, getDb, readBody } from '../../../lib/api.ts';
import { registerSelf } from '../../../lib/tournament/registration.ts';

/** Public: sign up from the QR sheet. Returns only the slot you got, never anyone's details. */
export async function POST(req: Request) {
  try {
    const b = await readBody(req);
    const result = await registerSelf(getDb(), {
      division: b.division,
      ringName: b.ringName,
      firstName: b.firstName as string,
      phone: b.phone as string,
      initials: b.initials as string,
      website: b.website,
    });
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return errorResponse(e);
  }
}
