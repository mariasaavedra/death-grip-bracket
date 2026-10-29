import { describe, expect, it } from 'vitest';
import { realisticEntrants } from './fixtures.ts';
import { createTestDb } from './test-db.ts';
import { resetTournament, seedTournament } from './seed.ts';
import { loadState } from './storage.ts';
import { eligibleMatches } from './selectors.ts';
import { recordResult } from './service.ts';

describe('fixtures', () => {
  it('are deterministic, unique per division, and 8 per division', () => {
    const a = realisticEntrants();
    expect(realisticEntrants()).toEqual(a);
    for (const d of ['femmes', 'mascs'] as const) {
      expect(a[d]).toHaveLength(8);
      expect(new Set(a[d].map((n) => n.toLowerCase())).size).toBe(8);
    }
  });
});

describe('seed', () => {
  it('creates 16 active competitors and two active double-elimination stages', async () => {
    const db = createTestDb();
    expect(await seedTournament(db)).toMatchObject({ seeded: true });
    const s = await loadState(db);
    for (const d of ['femmes', 'mascs'] as const) {
      expect(s.app.divisions[d].competitors).toHaveLength(8);
      expect(s.app.divisions[d].competitors.every((c) => c.status === 'active')).toBe(true);
      expect(s.app.divisions[d].status).toBe('active');
    }
    const names = [...s.app.divisions.femmes.competitors, ...s.app.divisions.mascs.competitors].map((c) => c.name);
    expect(names.every((n) => n.trim() === n && n.length > 0 && n.length <= 60)).toBe(true);
    expect(names.some((n) => /^(Femme|Masc) \d+$/.test(n))).toBe(false);
    expect(s.brackets.stage.map((st) => st.type)).toEqual(['double_elimination', 'double_elimination']);
    expect(s.app.display).toEqual({ division: 'femmes', mode: 'bracket', matchId: null });
  });

  it('does not overwrite an existing tournament; forced reset clears results', async () => {
    const db = createTestDb();
    await seedTournament(db);
    let s = await loadState(db);
    const [m] = eligibleMatches(s.brackets, s.app.divisions.femmes.stageId);
    s = await recordResult(db, Number(m.id), m.opponent1!.id, s.version);
    expect(await seedTournament(db)).toEqual({ seeded: false, version: s.version });
    expect((await loadState(db)).brackets).toEqual(s.brackets);

    await resetTournament(db);
    const after = await loadState(db);
    expect(after.brackets.match.every((x) => x.opponent1?.result === undefined && x.opponent2?.result === undefined)).toBe(true);
    expect(after.brackets.stage).toHaveLength(2);
    expect(eligibleMatches(after.brackets, after.app.divisions.femmes.stageId)).toHaveLength(4);
  });
});
