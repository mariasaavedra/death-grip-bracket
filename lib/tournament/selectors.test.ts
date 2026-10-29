import { describe, expect, it } from 'vitest';
import { createTestDb } from './test-db.ts';
import { seedTournament } from './seed.ts';
import { loadState } from './storage.ts';
import { recordResult } from './service.ts';
import { championName, eligibleMatches, matchLabel, standings } from './selectors.ts';

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

  it('ranks by losses then wins once results exist; none before', async () => {
    const db = createTestDb();
    await seedTournament(db);
    let s = await loadState(db);
    const stageId = s.app.divisions.femmes.stageId;
    expect(standings(s.brackets, stageId)).toBeNull();
    const [m] = eligibleMatches(s.brackets, stageId);
    s = await recordResult(db, Number(m.id), m.opponent1!.id, s.version);
    const ranks = standings(s.brackets, stageId)!;
    expect(ranks.get(m.opponent1!.id!)).toBe(1);
    expect(ranks.get(m.opponent2!.id!)).toBe(8);
    expect(ranks.size).toBe(8);
  });
});
