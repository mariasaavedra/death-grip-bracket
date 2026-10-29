import { seedTournament } from '../lib/tournament/seed.ts';
import { D1_DATABASE_ID } from '../lib/tournament/constants.ts';
import { remoteD1 } from './d1-cli.ts';

// Writes to the REMOTE database, so it only runs when explicitly confirmed.
if (!process.argv.includes('--confirm-remote')) {
  console.error(`Refusing to seed remote D1 (${D1_DATABASE_ID}). Re-run with --confirm-remote.`);
  process.exit(1);
}

// Run `npm run db:migrate:remote` first; this script does not create the table.
const result = await seedTournament(remoteD1());
console.log(
  result.seeded
    ? `Seeded REMOTE D1 with fixture data for both brackets. Version ${result.version}.`
    : `Remote tournament already initialized (version ${result.version}); nothing changed.`,
);
