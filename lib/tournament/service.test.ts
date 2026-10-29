import { describe, expect, it } from 'vitest';
import { createTestDb } from './test-db.ts';
import { loadState } from './storage.ts';
import { registerCompetitor, removeCompetitor, setDisplay, startDivision, updateCompetitor } from './service.ts';

async function register(db: D1Database, division: string, name: string, status = 'active') {
  const { version } = await loadState(db);
  return registerCompetitor(db, { division, name, status, expectedVersion: version });
}

describe('registration', () => {
  it('trims names and rejects blanks and case-insensitive duplicates', async () => {
    const db = createTestDb();
    const s = await register(db, 'femmes', '  Ada  ');
    expect(s.app.divisions.femmes.competitors[0].name).toBe('Ada');
    await expect(register(db, 'femmes', 'ADA')).rejects.toMatchObject({ status: 400 });
    await expect(register(db, 'femmes', '   ')).rejects.toMatchObject({ status: 400 });
    await register(db, 'mascs', 'Ada'); // uniqueness is per division
  });

  it('enforces 8 active / 3 alternate capacity', async () => {
    const db = createTestDb();
    for (let i = 0; i < 8; i++) await register(db, 'femmes', `F${i}`);
    await expect(register(db, 'femmes', 'F8')).rejects.toMatchObject({ status: 400 });
    for (let i = 0; i < 3; i++) await register(db, 'femmes', `Alt${i}`, 'alternate');
    await expect(register(db, 'femmes', 'Alt3', 'alternate')).rejects.toMatchObject({ status: 400 });
    const { version, app } = await loadState(db);
    // Promoting an alternate into a full active roster is rejected.
    await expect(updateCompetitor(db, app.divisions.femmes.competitors[8].id, { status: 'active', expectedVersion: version })).rejects.toMatchObject({ status: 400 });
  });

  it('requires exactly 8 active to start, excludes alternates, and locks registration', async () => {
    const db = createTestDb();
    for (let i = 0; i < 7; i++) await register(db, 'femmes', `F${i}`);
    await expect(startDivision(db, 'femmes', (await loadState(db)).version)).rejects.toMatchObject({ status: 400 });
    await register(db, 'femmes', 'F7');
    await register(db, 'femmes', 'Alt', 'alternate');
    const s = await startDivision(db, 'femmes', (await loadState(db)).version);
    expect(s.app.divisions.femmes.status).toBe('active');
    expect(s.brackets.participant).toHaveLength(8);
    await expect(register(db, 'femmes', 'Late')).rejects.toMatchObject({ status: 409 });
    await expect(removeCompetitor(db, s.app.divisions.femmes.competitors[0].id, s.version)).rejects.toMatchObject({ status: 409 });
    await expect(startDivision(db, 'femmes', s.version)).rejects.toMatchObject({ status: 409 });
  });

  it('rejects an unknown division and a stale revision', async () => {
    const db = createTestDb();
    await expect(registerCompetitor(db, { division: 'x', name: 'A', status: 'active', expectedVersion: 0 })).rejects.toMatchObject({ status: 400 });
    await register(db, 'femmes', 'A');
    await expect(registerCompetitor(db, { division: 'femmes', name: 'B', status: 'active', expectedVersion: 0 })).rejects.toMatchObject({ status: 409 });
  });
});

describe('display', () => {
  it('persists changes, validates the match division, and gates champion mode', async () => {
    const { seedTournament } = await import('./seed.ts');
    const db = createTestDb();
    await seedTournament(db);
    let s = await loadState(db);
    s = await setDisplay(db, { division: 'mascs', mode: 'matchup', expectedVersion: s.version });
    expect((await loadState(db)).app.display).toMatchObject({ division: 'mascs', mode: 'matchup' });
    const femmesMatch = s.brackets.match.find((m) => m.stage_id === s.app.divisions.femmes.stageId)!;
    await expect(setDisplay(db, { matchId: femmesMatch.id, expectedVersion: s.version })).rejects.toMatchObject({ status: 400 });
    await expect(setDisplay(db, { mode: 'champion', expectedVersion: s.version })).rejects.toMatchObject({ status: 409 });
  });
});
