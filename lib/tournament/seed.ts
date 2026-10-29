import { DIVISION_IDS } from './constants.ts';
import { addCompetitor, createDivisionStage, mutate } from './service.ts';
import { loadState } from './storage.ts';
import type { DivisionId } from './types.ts';

const PREFIX: Record<DivisionId, string> = { femmes: 'Femme', mascs: 'Masc' };

export const SEED_ENTRANTS: Record<DivisionId, string[]> = {
  femmes: Array.from({ length: 8 }, (_, i) => `${PREFIX.femmes} ${String(i + 1).padStart(2, '0')}`),
  mascs: Array.from({ length: 8 }, (_, i) => `${PREFIX.mascs} ${String(i + 1).padStart(2, '0')}`),
};

/** Seeds both brackets in one mutation. `fresh` discards any existing snapshot. */
async function runSeed(db: D1Database, version: number, fresh: boolean) {
  return mutate(
    db,
    version,
    async (ctx) => {
      for (const division of DIVISION_IDS) {
        for (const name of SEED_ENTRANTS[division]) addCompetitor(ctx.app, division, name, 'active');
        await createDivisionStage(ctx, division, { randomize: false });
      }
      ctx.app.display = { division: 'femmes', mode: 'bracket', matchId: null };
    },
    { fresh },
  );
}

/** Seeds only an untouched tournament. Never overwrites existing state or results. */
export async function seedTournament(db: D1Database): Promise<{ seeded: boolean; version: number }> {
  const current = await loadState(db);
  const untouched = DIVISION_IDS.every((d) => current.app.divisions[d].status === 'registration' && current.app.divisions[d].competitors.length === 0);
  if (!untouched) return { seeded: false, version: current.version };
  const next = await runSeed(db, current.version, false);
  return { seeded: true, version: next.version };
}

/** Replaces the snapshot with a freshly seeded tournament, clearing all results. */
export async function resetTournament(db: D1Database): Promise<{ version: number }> {
  const current = await loadState(db);
  const next = await runSeed(db, current.version, true);
  return { version: next.version };
}
