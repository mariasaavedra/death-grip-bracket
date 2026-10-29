import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

/** In-memory stand-in for the D1 methods the storage layer uses, backed by node:sqlite. */
export function createTestDb(): D1Database & { failNextWrite(): void } {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../../migrations/0001_init.sql', import.meta.url), 'utf8'));
  let failWrite = false;
  const statement = (sql: string, params: unknown[]) => ({
    bind: (...values: unknown[]) => statement(sql, values),
    first: async () => (sqlite.prepare(sql).get(...(params as never[])) as unknown) ?? null,
    run: async () => {
      if (failWrite && /^\s*UPDATE/i.test(sql)) {
        failWrite = false;
        throw new Error('simulated D1 failure');
      }
      return { meta: { changes: Number(sqlite.prepare(sql).run(...(params as never[])).changes) } };
    },
  });
  return { prepare: (sql: string) => statement(sql, []), failNextWrite: () => (failWrite = true) } as unknown as D1Database & {
    failNextWrite(): void;
  };
}
