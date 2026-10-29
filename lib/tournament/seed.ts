import { DIVISION_IDS } from './constants.ts';
import { addCompetitor, createDivisionStage, mutate } from './service.ts';
import { realisticEntrants } from './fixtures.ts';
import { loadState } from './storage.ts';
import { deleteAllContacts } from './registration.ts';
import { deleteAllVotes } from './votes.ts';

export interface SeedOptions {
  /** Pre-register 8 realistic competitors per division (still unstarted). */
  fixtures?: boolean;
  /** Also start both brackets (implies fixtures): the old "ready to play" state, used by tests and dev. */
  start?: boolean;
}

/**
 * Default: both divisions in registration with nobody signed up, guide on screen, waiting for
 * sign-ups. `fixtures` fills the rosters; `start` also creates the brackets. One mutation, shared
 * stage-creation code with the normal start workflow. `fresh` discards any existing snapshot.
 */
async function runSeed(db: D1Database, version: number, fresh: boolean, options: SeedOptions) {
  const fixtures = options.fixtures || options.start;
  const entrants = fixtures ? realisticEntrants() : null;
  return mutate(
    db,
    version,
    async (ctx) => {
      for (const division of DIVISION_IDS) {
        if (!entrants) continue;
        for (const name of entrants[division]) addCompetitor(ctx.app, division, name, 'active');
        if (options.start) await createDivisionStage(ctx, division, { randomize: false });
      }
      ctx.app.display = { division: 'femmes', mode: options.start ? 'bracket' : 'guide', matchId: null, showVotes: false };
    },
    { fresh },
  );
}

/** Initializes only a never-written tournament. Never overwrites existing state, rosters or results. */
export async function seedTournament(db: D1Database, options: SeedOptions = {}): Promise<{ seeded: boolean; version: number }> {
  const current = await loadState(db);
  const untouched =
    current.version === 0 && DIVISION_IDS.every((d) => current.app.divisions[d].status === 'registration' && current.app.divisions[d].competitors.length === 0);
  if (!untouched) return { seeded: false, version: current.version };
  const next = await runSeed(db, current.version, false, options);
  return { seeded: true, version: next.version };
}

/** Replaces the snapshot with a freshly seeded tournament, clearing results, votes and sign-up details. */
export async function resetTournament(db: D1Database, options: SeedOptions = {}): Promise<{ version: number }> {
  const current = await loadState(db);
  const next = await runSeed(db, current.version, true, options);
  await deleteAllVotes(db);
  await deleteAllContacts(db);
  return { version: next.version };
}
