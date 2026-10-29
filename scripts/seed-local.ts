import { seedTournament } from '../lib/tournament/seed.ts';
import { applyMigration, localD1, LOCAL_STATE_DIR } from './d1-cli.ts';

const args = process.argv.slice(2);
applyMigration();
const result = await seedTournament(localD1(), { fixtures: args.includes('--fixtures'), start: args.includes('--start') });
console.log(
  result.seeded
    ? `Initialized local D1 (${LOCAL_STATE_DIR}): both divisions open for registration. Version ${result.version}.`
    : `Local tournament already initialized (version ${result.version}); nothing changed.`,
);
