import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { D1_DATABASE_ID } from '../lib/tournament/constants.ts';

export const LOCAL_STATE_DIR = '.local-state';

interface RawResult {
  results: { columns: string[]; rows: unknown[][] };
  meta: { changes: number };
}

function raw(sql: string, params: unknown[]): RawResult {
  // `--local` is always passed: this adapter can only ever reach the local simulation.
  const out = execFileSync(
    'npx',
    ['cf', 'd1', 'raw', D1_DATABASE_ID, '--local', '--persist-to', LOCAL_STATE_DIR, '--sql', sql, ...params.map((p) => `--params=${p}`)],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'inherit'] },
  );
  return JSON.parse(out)[0];
}

/** The slice of D1Database the tournament storage layer uses, backed by `cf d1 raw --local`. */
export function localD1(): D1Database {
  const statement = (sql: string, params: unknown[]) => ({
    bind: (...values: unknown[]) => statement(sql, values),
    first: async () => {
      const { results } = raw(sql, params);
      const row = results.rows[0];
      return row ? Object.fromEntries(results.columns.map((c, i) => [c, row[i]])) : null;
    },
    run: async () => ({ meta: raw(sql, params).meta }),
  });
  return { prepare: (sql: string) => statement(sql, []) } as unknown as D1Database;
}

/** Applies the committed migration file (idempotent). */
export function applyMigration() {
  raw(readFileSync(new URL('../migrations/0001_init.sql', import.meta.url), 'utf8'), []);
}
