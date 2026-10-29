import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { D1_DATABASE_ID } from '../lib/tournament/constants.ts';

export const LOCAL_STATE_DIR = '.local-state';

interface RawResult {
  results: { columns: string[]; rows: unknown[][] };
  meta: { changes: number };
}

type Target = 'local' | 'remote';

function raw(target: Target, sql: string, params: unknown[]): RawResult {
  // Local runs always pass `--local`, so they can never reach remote. Remote is a separate,
  // explicit target; NODE_USE_SYSTEM_CA keeps the corporate TLS proxy working without disabling verification.
  const where = target === 'local' ? ['--local', '--persist-to', LOCAL_STATE_DIR] : [];
  const out = execFileSync(
    'npx',
    ['cf', 'd1', 'raw', D1_DATABASE_ID, ...where, '--sql', sql, ...params.map((p) => `--params=${p}`)],
    {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'inherit'],
      env: { ...process.env, NODE_USE_SYSTEM_CA: '1' },
    },
  );
  return JSON.parse(out)[0];
}

/** The slice of D1Database the tournament storage layer uses, backed by `cf d1 raw`. */
function d1(target: Target): D1Database {
  const statement = (sql: string, params: unknown[]) => ({
    bind: (...values: unknown[]) => statement(sql, values),
    first: async () => {
      const { results } = raw(target, sql, params);
      const row = results.rows[0];
      return row ? Object.fromEntries(results.columns.map((c, i) => [c, row[i]])) : null;
    },
    run: async () => ({ meta: raw(target, sql, params).meta }),
  });
  return { prepare: (sql: string) => statement(sql, []) } as unknown as D1Database;
}

export const localD1 = () => d1('local');
export const remoteD1 = () => d1('remote');

/** Applies the committed migration file to the local database (idempotent). */
export function applyMigration() {
  raw('local', readFileSync(new URL('../migrations/0001_init.sql', import.meta.url), 'utf8'), []);
}
