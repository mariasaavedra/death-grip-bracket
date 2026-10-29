import { seedTournament } from '../lib/tournament/seed.ts';
import { applyMigration, localD1, LOCAL_STATE_DIR } from './d1-cli.ts';

applyMigration();
const result = await seedTournament(localD1());
console.log(
  result.seeded
    ? `Seeded local D1 (${LOCAL_STATE_DIR}) with both brackets. Version ${result.version}.`
    : `Local tournament already initialized (version ${result.version}); nothing changed.`,
);
