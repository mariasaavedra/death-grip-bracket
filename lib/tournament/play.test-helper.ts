import { eligibleMatches, matchLabel } from './selectors.ts';
import { loadState } from './storage.ts';
import { recordResult } from './service.ts';
import type { DivisionId, TournamentState } from './types.ts';

/** Plays every eligible match; `pick` returns 1 or 2 for which opponent wins. */
export async function playOut(
  db: D1Database,
  division: DivisionId,
  pick: (label: string) => 1 | 2,
  maxMatches = 40,
): Promise<TournamentState> {
  let state = await loadState(db);
  for (let i = 0; i < maxMatches; i++) {
    const stageId = state.app.divisions[division].stageId;
    const [match] = eligibleMatches(state.brackets, stageId);
    if (!match) break;
    const side = pick(matchLabel(state.brackets, match));
    const winner = side === 1 ? match.opponent1!.id : match.opponent2!.id;
    state = await recordResult(db, Number(match.id), winner, state.version);
  }
  return state;
}
