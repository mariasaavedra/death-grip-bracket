import { Status } from 'brackets-model';
import type { Group, Match, Participant, Round } from 'brackets-model';
import type { AppState, BracketsData, DivisionId } from './types.ts';

export function stageMatches(brackets: BracketsData, stageId: number | null): Match[] {
  return stageId === null ? [] : brackets.match.filter((m) => m.stage_id === stageId);
}

export function participantName(brackets: BracketsData, id: number | string | null | undefined): string | null {
  if (id === null || id === undefined) return null;
  return brackets.participant.find((p: Participant) => p.id === id)?.name ?? null;
}

export function divisionOfMatch(app: AppState, brackets: BracketsData, matchId: number | string): DivisionId | null {
  const match = brackets.match.find((m) => m.id === matchId);
  if (!match) return null;
  return (['femmes', 'mascs'] as const).find((d) => app.divisions[d].stageId === match.stage_id) ?? null;
}

export function hasBothOpponents(m: Match): boolean {
  return m.opponent1?.id != null && m.opponent2?.id != null;
}

/** Matches that have two known opponents, no recorded result, and are able to take one. */
export function eligibleMatches(brackets: BracketsData, stageId: number | null): Match[] {
  // The manager leaves the grand-final reset open when the undefeated finalist wins GF1; it is not needed then.
  if (isDivisionComplete(brackets, stageId)) return [];
  return stageMatches(brackets, stageId).filter(
    (m) => hasBothOpponents(m) && (m.status === Status.Ready || m.status === Status.Running),
  );
}

export function completedMatches(brackets: BracketsData, stageId: number | null): Match[] {
  return stageMatches(brackets, stageId).filter(
    (m) => hasBothOpponents(m) && (m.status === Status.Completed || m.status === Status.Archived),
  );
}

export function matchWinnerId(m: Match): number | string | null {
  if (m.opponent1?.result === 'win') return m.opponent1.id;
  if (m.opponent2?.result === 'win') return m.opponent2.id;
  return null;
}

/** Losses per participant, computed from completed native matches. */
export function lossCounts(brackets: BracketsData, stageId: number | null): Map<number | string, number> {
  const losses = new Map<number | string, number>();
  for (const m of stageMatches(brackets, stageId)) {
    for (const o of [m.opponent1, m.opponent2]) {
      if (o?.id != null && o.result === 'loss') losses.set(o.id, (losses.get(o.id) ?? 0) + 1);
    }
  }
  return losses;
}

/** Wins and losses per participant, computed from native match results. */
export function records(brackets: BracketsData, stageId: number | null): Map<number | string, { wins: number; losses: number }> {
  const out = new Map<number | string, { wins: number; losses: number }>();
  for (const m of stageMatches(brackets, stageId)) {
    for (const o of [m.opponent1, m.opponent2]) {
      if (o?.id == null || (o.result !== 'win' && o.result !== 'loss')) continue;
      const r = out.get(o.id) ?? { wins: 0, losses: 0 };
      if (o.result === 'win') r.wins++;
      else r.losses++;
      out.set(o.id, r);
    }
  }
  return out;
}

/**
 * Standing per participant: 1 + the number of participants strictly ahead (fewer losses, or equal
 * losses and more wins). Ties share a rank. Null until a match has been completed.
 */
export function standings(brackets: BracketsData, stageId: number | null): Map<number | string, number> | null {
  const recs = records(brackets, stageId);
  if (recs.size === 0) return null;
  const ids = brackets.participant
    .filter((p) => stageMatches(brackets, stageId).some((m) => m.opponent1?.id === p.id || m.opponent2?.id === p.id))
    .map((p) => p.id);
  const get = (id: number | string) => recs.get(id) ?? { wins: 0, losses: 0 };
  const ahead = (a: number | string, b: number | string) =>
    get(a).losses < get(b).losses || (get(a).losses === get(b).losses && get(a).wins > get(b).wins);
  return new Map(ids.map((id) => [id, 1 + ids.filter((other) => ahead(other, id)).length]));
}

export function eliminatedIds(brackets: BracketsData, stageId: number | null): (number | string)[] {
  return [...lossCounts(brackets, stageId)].filter(([, n]) => n >= 2).map(([id]) => id);
}

function groupNumberOf(brackets: BracketsData, m: Match): number {
  return brackets.group.find((g: Group) => g.id === m.group_id)?.number ?? 0;
}

function roundNumberOf(brackets: BracketsData, m: Match): number {
  return brackets.round.find((r: Round) => r.id === m.round_id)?.number ?? 0;
}

export type BracketSide = 'winners' | 'losers' | 'final';

export function matchSide(brackets: BracketsData, m: Match): BracketSide {
  const group = groupNumberOf(brackets, m);
  return group === 1 ? 'winners' : group === 2 ? 'losers' : 'final';
}

export function matchLabel(brackets: BracketsData, m: Match): string {
  const group = groupNumberOf(brackets, m);
  const round = roundNumberOf(brackets, m);
  if (group === 1) return `Championship Round ${round}`;
  if (group === 2) return `Elimination Round ${round}`;
  return round === 1 ? 'Grand Final' : 'Grand Final Reset';
}

/** Champion participant id for a double-elimination stage with a double grand final. */
export function championId(brackets: BracketsData, stageId: number | null): number | string | null {
  const finals = stageMatches(brackets, stageId)
    .filter((m) => groupNumberOf(brackets, m) === 3)
    .sort((a, b) => roundNumberOf(brackets, a) - roundNumberOf(brackets, b));
  const [first, reset] = finals;
  if (!first || first.status < Status.Completed) return null;
  // Undefeated finalist (opponent1) won: no reset needed.
  if (first.opponent1?.result === 'win') return first.opponent1.id;
  if (reset && reset.status >= Status.Completed) return matchWinnerId(reset);
  return null;
}

/**
 * Matches with a recorded result out of the matches this division will actually need.
 * The grand-final reset only counts once the one-loss finalist has forced it.
 */
export function divisionProgress(brackets: BracketsData, stageId: number | null): { played: number; total: number } {
  const matches = stageMatches(brackets, stageId);
  const finals = matches
    .filter((m) => groupNumberOf(brackets, m) === 3)
    .sort((a, b) => roundNumberOf(brackets, a) - roundNumberOf(brackets, b));
  const [first, reset] = finals;
  const resetNeeded = !!reset && first?.status >= Status.Completed && first.opponent2?.result === 'win';
  const counted = matches.filter((m) => m !== reset || resetNeeded);
  return { played: counted.filter((m) => matchWinnerId(m) !== null).length, total: counted.length };
}

export function championName(brackets: BracketsData, stageId: number | null): string | null {
  return participantName(brackets, championId(brackets, stageId));
}

export function isDivisionComplete(brackets: BracketsData, stageId: number | null): boolean {
  return championId(brackets, stageId) !== null;
}
