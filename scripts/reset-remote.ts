import { resetTournament } from '../lib/tournament/seed.ts';
import { D1_DATABASE_ID } from '../lib/tournament/constants.ts';
import { remoteD1 } from './d1-cli.ts';

// DESTRUCTIVE: wipes the REMOTE tournament (rosters, results, votes, sign-up contacts).
const args = process.argv.slice(2);
if (!args.includes('--confirm-remote')) {
  console.error(`Refusing to reset remote D1 (${D1_DATABASE_ID}). Re-run with --confirm-remote.`);
  process.exit(1);
}

const result = await resetTournament(remoteD1(), { fixtures: false });
console.log(`REMOTE D1 reset: both divisions open for registration, no competitors. Version ${result.version}.`);
