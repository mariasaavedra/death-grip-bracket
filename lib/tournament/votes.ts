import { ApiError } from './types.ts';
import type { AppState, DivisionId } from './types.ts';
import { loadState } from './storage.ts';

/**
 * Best-ring-name voting. Each division's votes live in their own row of tournament_state
 * (id `votes-<division>`), so a vote is one atomic SQL update that never touches the tournament
 * row or its version.
 */
export type VotingStatus = 'closed' | 'open';

interface VoteRow {
  status: VotingStatus;
  /** voterId (cookie UUID) -> competitor id */
  ballots: Record<string, string>;
}

export interface Candidate {
  id: string;
  name: string;
  status: 'active' | 'alternate';
}

export interface VoteInfo {
  division: DivisionId;
  status: VotingStatus;
  candidates: Candidate[];
  myVote: string | null;
  resultsVisible: boolean;
  /** Present only when results are visible (director reveal) or the caller is the admin. */
  counts?: Record<string, number>;
  total?: number;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const rowId = (division: DivisionId) => `votes-${division}`;

export const isVoterId = (value: unknown): value is string => typeof value === 'string' && UUID.test(value);

/** Everyone registered for the division, alternates included, eliminated or not. */
export function candidatesOf(app: AppState, division: DivisionId): Candidate[] {
  return app.divisions[division].competitors.map(({ id, name, status }) => ({ id, name, status }));
}

export function tally(ballots: Record<string, string>, candidates: Candidate[]): Record<string, number> {
  const counts = Object.fromEntries(candidates.map((c) => [c.id, 0]));
  for (const competitorId of Object.values(ballots)) if (competitorId in counts) counts[competitorId]++;
  return counts;
}

/** Everyone sharing the top (non-zero) count. */
export function winners(counts: Record<string, number>): string[] {
  const top = Math.max(0, ...Object.values(counts));
  return top === 0 ? [] : Object.keys(counts).filter((id) => counts[id] === top);
}

async function loadRow(db: D1Database, division: DivisionId): Promise<VoteRow> {
  const read = () => db.prepare('SELECT data FROM tournament_state WHERE id = ?').bind(rowId(division)).first<{ data: string }>();
  let row = await read();
  if (!row) {
    await db
      .prepare('INSERT OR IGNORE INTO tournament_state (id, data, version) VALUES (?, ?, 0)')
      .bind(rowId(division), JSON.stringify({ status: 'closed', ballots: {} } satisfies VoteRow))
      .run();
    row = await read();
  }
  return JSON.parse(row!.data) as VoteRow;
}

export async function getVoteInfo(
  db: D1Database,
  division: DivisionId,
  opts: { voterId?: string | null; isAdmin: boolean },
): Promise<VoteInfo> {
  const [state, row] = await Promise.all([loadState(db), loadRow(db, division)]);
  const display = state.app.display;
  const resultsVisible = display.mode === 'vote' && display.division === division && display.showVotes;
  const candidates = candidatesOf(state.app, division);
  const info: VoteInfo = {
    division,
    status: row.status,
    candidates,
    myVote: (opts.voterId && row.ballots[opts.voterId]) || null,
    resultsVisible,
  };
  if (resultsVisible || opts.isAdmin) {
    info.counts = tally(row.ballots, candidates);
    info.total = Object.values(info.counts).reduce((a, b) => a + b, 0);
  }
  return info;
}

/** One ballot per voter: casting again replaces their earlier choice. */
export async function castVote(db: D1Database, division: DivisionId, voterId: string, competitorId: unknown) {
  if (!isVoterId(voterId)) throw new ApiError(400, 'Invalid voter');
  const state = await loadState(db);
  if (!candidatesOf(state.app, division).some((c) => c.id === competitorId)) {
    throw new ApiError(400, 'That competitor is not on this ballot');
  }
  await loadRow(db, division); // make sure the row exists
  const result = await db
    .prepare(
      `UPDATE tournament_state
         SET data = json_set(data, '$.ballots."' || ? || '"', ?), version = version + 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND json_extract(data, '$.status') = 'open'`,
    )
    .bind(voterId, competitorId, rowId(division))
    .run();
  if (!result.meta.changes) throw new ApiError(409, 'Voting is closed');
}

export async function setVotingStatus(db: D1Database, division: DivisionId, status: VotingStatus) {
  if (status !== 'open' && status !== 'closed') throw new ApiError(400, 'Status must be open or closed');
  if (status === 'open') {
    const state = await loadState(db);
    if (state.app.divisions[division].status === 'registration') throw new ApiError(409, 'Start the bracket before opening voting');
  }
  await loadRow(db, division);
  await db
    .prepare(`UPDATE tournament_state SET data = json_set(data, '$.status', ?), version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .bind(status, rowId(division))
    .run();
}

export async function clearVotes(db: D1Database, division: DivisionId) {
  await loadRow(db, division);
  await db
    .prepare(`UPDATE tournament_state SET data = json_set(data, '$.ballots', json('{}')), version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .bind(rowId(division))
    .run();
}

export async function deleteAllVotes(db: D1Database) {
  await db.prepare(`DELETE FROM tournament_state WHERE id LIKE 'votes-%'`).run();
}
