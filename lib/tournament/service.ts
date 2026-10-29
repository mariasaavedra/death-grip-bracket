import { Status } from 'brackets-model';
import { ACTIVE_LIMIT, ALTERNATE_LIMIT, BRACKET_TOURNAMENT_ID, DIVISION_IDS, DIVISION_NAMES, STAGE_SETTINGS } from './constants.ts';
import { openManager } from './manager.ts';
import { divisionOfMatch, eligibleMatches, isDivisionComplete, matchWinnerId, stageMatches } from './selectors.ts';
import { initialSnapshot, loadState, saveState } from './storage.ts';
import { ApiError, VersionConflictError } from './types.ts';
import type { AppState, Competitor, CompetitorStatus, DisplayMode, DivisionId, TournamentState } from './types.ts';

type Ctx = ReturnType<typeof openManager> & { app: AppState };

/**
 * Every mutation: load -> check revision -> hydrate fresh manager -> run -> export -> conditional write.
 * Throwing anywhere leaves the stored row untouched.
 */
export async function mutate(
  db: D1Database,
  expectedVersion: number,
  fn: (ctx: Ctx) => Promise<void> | void,
  opts: { fresh?: boolean } = {},
): Promise<TournamentState> {
  const current = await loadState(db);
  if (current.version !== expectedVersion) throw new VersionConflictError();
  const base = opts.fresh ? initialSnapshot() : current;
  const app: AppState = JSON.parse(JSON.stringify(base.app));
  const ctx = { ...openManager(base.brackets), app };
  await fn(ctx);
  return saveState(db, current.version, { brackets: await ctx.exportData(), app });
}

export function assertDivision(value: unknown): DivisionId {
  if (!DIVISION_IDS.includes(value as DivisionId)) throw new ApiError(400, 'Unknown division');
  return value as DivisionId;
}

function cleanName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name) throw new ApiError(400, 'Ring name is required');
  if (name.length > 60) throw new ApiError(400, 'Ring name is too long');
  return name;
}

function assertStatus(value: unknown): CompetitorStatus {
  if (value !== 'active' && value !== 'alternate') throw new ApiError(400, 'Status must be active or alternate');
  return value;
}

function assertRegistrationOpen(app: AppState, division: DivisionId) {
  if (app.divisions[division].status !== 'registration') throw new ApiError(409, 'Registration is locked for this division');
}

/** Validates uniqueness and capacity for the competitor list as it would look after the change. */
function validateRoster(competitors: Competitor[]) {
  const seen = new Set<string>();
  for (const c of competitors) {
    const key = c.name.toLowerCase();
    if (seen.has(key)) throw new ApiError(400, `"${c.name}" is already registered in this division`);
    seen.add(key);
  }
  if (competitors.filter((c) => c.status === 'active').length > ACTIVE_LIMIT) {
    throw new ApiError(400, `A division may have at most ${ACTIVE_LIMIT} active competitors`);
  }
  if (competitors.filter((c) => c.status === 'alternate').length > ALTERNATE_LIMIT) {
    throw new ApiError(400, `A division may have at most ${ALTERNATE_LIMIT} alternates`);
  }
}

export function addCompetitor(
  app: AppState,
  division: DivisionId,
  name: unknown,
  status: unknown,
  id: string = crypto.randomUUID(),
): Competitor {
  assertRegistrationOpen(app, division);
  const competitor: Competitor = { id, name: cleanName(name), status: assertStatus(status) };
  const next = [...app.divisions[division].competitors, competitor];
  validateRoster(next);
  app.divisions[division].competitors = next;
  return competitor;
}

function shuffled<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Shared by the start endpoint and the seed helper. */
export async function createDivisionStage(ctx: Ctx, division: DivisionId, opts: { randomize: boolean }) {
  const state = ctx.app.divisions[division];
  if (state.status !== 'registration' || state.stageId !== null) {
    throw new ApiError(409, 'This division has already started');
  }
  const active = state.competitors.filter((c) => c.status === 'active');
  if (active.length !== ACTIVE_LIMIT) throw new ApiError(400, `Exactly ${ACTIVE_LIMIT} active competitors are required to start`);
  const order = opts.randomize ? shuffled(active) : active;
  const stage = await ctx.manager.create.stage({
    tournamentId: BRACKET_TOURNAMENT_ID,
    name: DIVISION_NAMES[division],
    type: STAGE_SETTINGS.type,
    seeding: order.map((c) => c.name),
    settings: { grandFinal: STAGE_SETTINGS.grandFinal },
  });
  state.stageId = Number(stage.id);
  state.status = 'active';
}

export async function registerCompetitor(db: D1Database, input: { division: unknown; name: unknown; status: unknown; expectedVersion: number }) {
  const division = assertDivision(input.division);
  return await mutate(db, input.expectedVersion, ({ app }) => {
    addCompetitor(app, division, input.name, input.status);
  });
}

export function updateCompetitor(db: D1Database, id: string, input: { name?: unknown; status?: unknown; expectedVersion: number }) {
  return mutate(db, input.expectedVersion, ({ app }) => {
    const division = DIVISION_IDS.find((d) => app.divisions[d].competitors.some((c) => c.id === id));
    if (!division) throw new ApiError(404, 'Competitor not found');
    assertRegistrationOpen(app, division);
    const next = app.divisions[division].competitors.map((c) => ({ ...c }));
    const target = next.find((c) => c.id === id)!;
    if (input.name !== undefined) target.name = cleanName(input.name);
    if (input.status !== undefined) target.status = assertStatus(input.status);
    validateRoster(next);
    app.divisions[division].competitors = next;
  });
}

export function removeCompetitor(db: D1Database, id: string, expectedVersion: number) {
  return mutate(db, expectedVersion, ({ app }) => {
    const division = DIVISION_IDS.find((d) => app.divisions[d].competitors.some((c) => c.id === id));
    if (!division) throw new ApiError(404, 'Competitor not found');
    assertRegistrationOpen(app, division);
    app.divisions[division].competitors = app.divisions[division].competitors.filter((c) => c.id !== id);
  });
}

export async function startDivision(db: D1Database, division: unknown, expectedVersion: number) {
  const id = assertDivision(division);
  return await mutate(db, expectedVersion, (ctx) => createDivisionStage(ctx, id, { randomize: true }));
}

async function refreshCompletion(ctx: Ctx, division: DivisionId) {
  const data = await ctx.exportData();
  const state = ctx.app.divisions[division];
  state.status = isDivisionComplete(data, state.stageId) ? 'completed' : 'active';
  const display = ctx.app.display;
  if (display.mode === 'champion' && ctx.app.divisions[display.division].status !== 'completed') display.mode = 'bracket';
}

export function recordResult(db: D1Database, matchId: number, winnerId: unknown, expectedVersion: number) {
  return mutate(db, expectedVersion, async (ctx) => {
    const data = await ctx.exportData();
    const match = data.match.find((m) => m.id === matchId);
    if (!match) throw new ApiError(404, 'Match not found');
    const division = divisionOfMatch(ctx.app, data, matchId);
    if (!division || ctx.app.divisions[division].status !== 'active') throw new ApiError(409, 'Match does not belong to an active division');
    if (match.status === Status.Completed || match.status === Status.Archived || matchWinnerId(match) !== null) {
      throw new ApiError(409, 'This match already has a recorded result');
    }
    if (match.opponent1?.id == null || match.opponent2?.id == null) throw new ApiError(409, 'Both opponents must be known');
    if (!eligibleMatches(data, Number(match.stage_id)).some((m) => m.id === matchId)) throw new ApiError(409, 'Match cannot accept a result yet');
    const first = match.opponent1.id === winnerId;
    if (!first && match.opponent2.id !== winnerId) throw new ApiError(400, 'Winner is not a participant in this match');
    try {
      await ctx.manager.update.match({
        id: matchId,
        opponent1: { result: first ? 'win' : 'loss' },
        opponent2: { result: first ? 'loss' : 'win' },
      });
    } catch (e) {
      throw new ApiError(409, `Result rejected: ${(e as Error).message}`);
    }
    await refreshCompletion(ctx, division);
  });
}

export function resetMatch(db: D1Database, matchId: number, expectedVersion: number) {
  return mutate(db, expectedVersion, async (ctx) => {
    const data = await ctx.exportData();
    const match = data.match.find((m) => m.id === matchId);
    if (!match) throw new ApiError(404, 'Match not found');
    const division = divisionOfMatch(ctx.app, data, matchId);
    if (!division) throw new ApiError(404, 'Match does not belong to a division');
    if (matchWinnerId(match) === null) throw new ApiError(409, 'This match has no recorded result');
    try {
      await ctx.manager.reset.matchResults(matchId);
    } catch (e) {
      throw new ApiError(409, `Cannot correct this result: ${(e as Error).message}`);
    }
    await refreshCompletion(ctx, division);
  });
}

export function setDisplay(
  db: D1Database,
  input: { division?: unknown; mode?: unknown; matchId?: unknown; showVotes?: unknown; expectedVersion: number },
) {
  return mutate(db, input.expectedVersion, async (ctx) => {
    const display = { ...ctx.app.display };
    if (input.division !== undefined) {
      display.division = assertDivision(input.division);
      if (input.matchId === undefined) display.matchId = null;
    }
    if (input.mode !== undefined) {
      if (!['guide', 'matchup', 'bracket', 'champion', 'vote'].includes(input.mode as string)) throw new ApiError(400, 'Unknown display mode');
      display.mode = input.mode as DisplayMode;
    }
    if (input.showVotes !== undefined) {
      if (typeof input.showVotes !== 'boolean') throw new ApiError(400, 'showVotes must be true or false');
      display.showVotes = input.showVotes;
    }
    if (input.matchId !== undefined) {
      if (input.matchId === null) display.matchId = null;
      else {
        const stageId = ctx.app.divisions[display.division].stageId;
        const data = await ctx.exportData();
        if (!stageMatches(data, stageId).some((m) => m.id === input.matchId)) {
          throw new ApiError(400, 'Selected match does not belong to the selected division');
        }
        display.matchId = input.matchId as number;
      }
    }
    if (display.mode === 'champion' && ctx.app.divisions[display.division].status !== 'completed') {
      throw new ApiError(409, 'Champion mode requires a completed division');
    }
    if (display.mode === 'vote' && ctx.app.divisions[display.division].status === 'registration') {
      throw new ApiError(409, 'Voting needs a started division');
    }
    ctx.app.display = display;
  });
}
