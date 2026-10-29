import { DIVISION_IDS, TOURNAMENT_ID } from './constants.ts';
import { VersionConflictError } from './types.ts';
import type { TournamentSnapshot, TournamentState } from './types.ts';

export function initialSnapshot(): TournamentSnapshot {
  return {
    brackets: { participant: [], stage: [], group: [], round: [], match: [], match_game: [] },
    app: {
      divisions: {
        femmes: { stageId: null, status: 'registration', competitors: [] },
        mascs: { stageId: null, status: 'registration', competitors: [] },
      },
      display: { division: 'femmes', mode: 'matchup', matchId: null, showVotes: false },
    },
  };
}

const BRACKET_KEYS = ['participant', 'stage', 'group', 'round', 'match', 'match_game'] as const;

function parseSnapshot(raw: string): TournamentSnapshot {
  const data = JSON.parse(raw);
  const ok =
    data &&
    data.brackets &&
    BRACKET_KEYS.every((k) => Array.isArray(data.brackets[k])) &&
    data.app?.display &&
    DIVISION_IDS.every((d) => Array.isArray(data.app.divisions?.[d]?.competitors));
  if (!ok) throw new Error('Stored tournament snapshot is malformed');
  data.app.display.showVotes ??= false; // snapshots written before voting existed
  return data as TournamentSnapshot;
}

interface Row {
  data: string;
  version: number;
  updated_at: string;
}

/** Read the singleton row, creating it first if it does not exist. */
export async function loadState(db: D1Database): Promise<TournamentState> {
  const select = () =>
    db
      .prepare('SELECT data, version, updated_at FROM tournament_state WHERE id = ?')
      .bind(TOURNAMENT_ID)
      .first<Row>();
  let row = await select();
  if (!row) {
    await db
      .prepare('INSERT OR IGNORE INTO tournament_state (id, data, version) VALUES (?, ?, 0)')
      .bind(TOURNAMENT_ID, JSON.stringify(initialSnapshot()))
      .run();
    row = await select();
    if (!row) throw new Error('Failed to initialize tournament state');
  }
  return { ...parseSnapshot(row.data), version: row.version, updatedAt: row.updated_at };
}

/** Conditionally write the snapshot; throws VersionConflictError if the stored version moved. */
export async function saveState(
  db: D1Database,
  expectedVersion: number,
  snapshot: TournamentSnapshot,
): Promise<TournamentState> {
  const result = await db
    .prepare(
      `UPDATE tournament_state
         SET data = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND version = ?`,
    )
    .bind(JSON.stringify(snapshot), TOURNAMENT_ID, expectedVersion)
    .run();
  if (!result.meta.changes) throw new VersionConflictError();
  return loadState(db);
}
