import { errorResponse, getDb, stateResponse } from '../../../lib/api.ts';
import { loadState } from '../../../lib/tournament/storage.ts';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return stateResponse(await loadState(getDb()));
  } catch (e) {
    return errorResponse(e);
  }
}
