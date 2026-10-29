import { describe, expect, it } from 'vitest';
import { createTestDb } from './test-db.ts';
import { initialSnapshot, loadState, saveState } from './storage.ts';
import { registerCompetitor } from './service.ts';

describe('storage', () => {
  it('initializes the singleton once and never resets it', async () => {
    const db = createTestDb();
    const first = await loadState(db);
    expect(first.version).toBe(0);
    expect(first.app.display).toEqual({ division: 'femmes', mode: 'matchup', matchId: null, showVotes: false });
    await registerCompetitor(db, { division: 'femmes', name: 'A', status: 'active', expectedVersion: 0 });
    expect((await loadState(db)).app.divisions.femmes.competitors).toHaveLength(1);
  });

  it('rejects stale writes without overwriting', async () => {
    const db = createTestDb();
    await loadState(db);
    await saveState(db, 0, initialSnapshot());
    await expect(saveState(db, 0, initialSnapshot())).rejects.toMatchObject({ status: 409 });
    expect((await loadState(db)).version).toBe(1);
  });

  it('keeps previous state and revision when a write fails', async () => {
    const db = createTestDb();
    await loadState(db);
    db.failNextWrite();
    await expect(registerCompetitor(db, { division: 'mascs', name: 'B', status: 'active', expectedVersion: 0 })).rejects.toThrow('simulated');
    const state = await loadState(db);
    expect(state.version).toBe(0);
    expect(state.app.divisions.mascs.competitors).toHaveLength(0);
  });

  it('round-trips native bracket records with ids and relationships intact', async () => {
    const { seedTournament } = await import('./seed.ts');
    const db = createTestDb();
    await seedTournament(db, { start: true });
    const a = await loadState(db);
    const b = await loadState(db);
    expect(b.brackets).toEqual(a.brackets);
    const roundIds = new Set(a.brackets.round.map((r) => r.id));
    expect(a.brackets.match.every((m) => roundIds.has(m.round_id))).toBe(true);
  });
});
