import { resetTournament } from '../lib/tournament/seed.ts';
import { applyMigration, localD1, LOCAL_STATE_DIR } from './d1-cli.ts';

const args = process.argv.slice(2);
if (!args.includes('--force')) {
  console.error('Refusing to reset: this erases all local data. Re-run with --force.');
  process.exit(1);
}

applyMigration();
const result = await resetTournament(localD1(), { fixtures: args.includes('--fixtures'), start: args.includes('--start') });
console.log(`Local D1 (${LOCAL_STATE_DIR}) reset: both divisions open for registration. Version ${result.version}.`);
