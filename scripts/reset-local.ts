import { resetTournament } from '../lib/tournament/seed.ts';
import { applyMigration, localD1, LOCAL_STATE_DIR } from './d1-cli.ts';

if (!process.argv.includes('--force')) {
  console.error('Refusing to reset: this erases all local results. Re-run with --force.');
  process.exit(1);
}

applyMigration();
const result = await resetTournament(localD1());
console.log(`Local D1 (${LOCAL_STATE_DIR}) reset and reseeded. Version ${result.version}.`);
