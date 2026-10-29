import { seedTournament } from '../lib/tournament/seed.ts';
import { D1_DATABASE_ID } from '../lib/tournament/constants.ts';
import { remoteD1 } from './d1-cli.ts';

// Writes to the REMOTE database, so it only runs when explicitly confirmed.
const args = process.argv.slice(2);
if (!args.includes('--confirm-remote')) {
  console.error(`Refusing to seed remote D1 (${D1_DATABASE_ID}). Re-run with --confirm-remote.`);
  process.exit(1);
}

// Run `npm run db:migrate:remote` first; this script does not create the table.
// Default is an empty tournament open for registration; add --fixtures only for a demo.
const result = await seedTournament(remoteD1(), { fixtures: args.includes('--fixtures') });
console.log(
  result.seeded
    ? `Initialized REMOTE D1: both divisions open for registration. Version ${result.version}.`
    : `Remote tournament already initialized (version ${result.version}); nothing changed.`,
);
