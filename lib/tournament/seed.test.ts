import { describe, expect, it } from 'vitest';
import { createTestDb } from './test-db.ts';
import { realisticEntrants } from './fixtures.ts';
import { resetTournament, seedTournament } from './seed.ts';
import { loadState } from './storage.ts';
import { eligibleMatches } from './selectors.ts';
import { recordResult, registerCompetitor } from './service.ts';

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
  it('defaults to both divisions open for registration, empty, with the guide on screen', async () => {
    const db = createTestDb();
    expect(await seedTournament(db)).toMatchObject({ seeded: true });
    const s = await loadState(db);
    for (const d of ['femmes', 'mascs'] as const) {
      expect(s.app.divisions[d]).toEqual({ stageId: null, status: 'registration', competitors: [] });
    }
    expect(s.brackets.stage).toHaveLength(0);
    expect(s.app.display).toEqual({ division: 'femmes', mode: 'guide', matchId: null, showVotes: false });
  });

  it('--fixtures pre-registers 8 realistic competitors per division without starting', async () => {
    const db = createTestDb();
    await seedTournament(db, { fixtures: true });
    const s = await loadState(db);
    for (const d of ['femmes', 'mascs'] as const) {
      const names = s.app.divisions[d].competitors.map((c) => c.name);
      expect(names).toHaveLength(8);
      expect(names.some((n) => /^(Femme|Masc) \d+$/.test(n))).toBe(false);
      expect(s.app.divisions[d].status).toBe('registration');
    }
    expect(s.brackets.stage).toHaveLength(0);
  });

  it('--start creates two active double-elimination stages with 16 competitors', async () => {
    const db = createTestDb();
    await seedTournament(db, { start: true });
    const s = await loadState(db);
    for (const d of ['femmes', 'mascs'] as const) {
      expect(s.app.divisions[d].competitors).toHaveLength(8);
      expect(s.app.divisions[d].status).toBe('active');
    }
    expect(s.brackets.stage.map((st) => st.type)).toEqual(['double_elimination', 'double_elimination']);
    expect(s.app.display).toEqual({ division: 'femmes', mode: 'bracket', matchId: null, showVotes: false });
  });

  it('never overwrites an existing tournament; forced reset clears everything', async () => {
    const db = createTestDb();
    await seedTournament(db, { start: true });
    let s = await loadState(db);
    const [m] = eligibleMatches(s.brackets, s.app.divisions.femmes.stageId);
    s = await recordResult(db, Number(m.id), m.opponent1!.id, s.version);
    expect(await seedTournament(db)).toEqual({ seeded: false, version: s.version });
    expect((await loadState(db)).brackets).toEqual(s.brackets);

    await resetTournament(db);
    const after = await loadState(db);
    expect(after.brackets.stage).toHaveLength(0);
    expect(after.app.divisions.femmes.competitors).toHaveLength(0);
    expect(after.app.divisions.femmes.status).toBe('registration');
  });

  it('does not re-seed once anyone has registered', async () => {
    const db = createTestDb();
    await seedTournament(db);
    const s = await loadState(db);
    await registerCompetitor(db, { division: 'femmes', name: 'Early Bird', status: 'active', expectedVersion: s.version });
    expect((await seedTournament(db, { start: true })).seeded).toBe(false);
    expect((await loadState(db)).app.divisions.femmes.competitors).toHaveLength(1);
  });
});
