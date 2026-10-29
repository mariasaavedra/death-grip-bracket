import { describe, expect, it } from 'vitest';
import { createTestDb } from './test-db.ts';
import { seedTournament } from './seed.ts';
import { loadState } from './storage.ts';
import { championName, eligibleMatches, matchLabel } from './selectors.ts';

describe('selectors', () => {
  it('labels matches and finds no champion before play', async () => {
    const db = createTestDb();
    await seedTournament(db);
    const s = await loadState(db);
    const stageId = s.app.divisions.femmes.stageId;
    expect(championName(s.brackets, stageId)).toBeNull();
    expect(eligibleMatches(s.brackets, stageId).map((m) => matchLabel(s.brackets, m))).toEqual(Array(4).fill('Winners Round 1'));
    expect(eligibleMatches(s.brackets, null)).toEqual([]);
  });
});
