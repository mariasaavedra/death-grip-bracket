import { describe, expect, it } from 'vitest';
import { createTestDb } from './test-db.ts';
import { deleteAllContacts, getContacts, registerSelf } from './registration.ts';
import { resetTournament, seedTournament } from './seed.ts';
import { startDivision } from './service.ts';
import { loadState } from './storage.ts';

const who = (n: number) => ({ division: 'femmes', ringName: `Fighter ${n}`, firstName: `Person${n}`, phone: '816-555-0100', initials: 'AB' });

describe('self registration', () => {
  it('fills main slots first-come first-served, then A-C, then reports full', async () => {
    const db = createTestDb();
    const slots: string[] = [];
    for (let i = 1; i <= 11; i++) slots.push((await registerSelf(db, who(i))).slot);
    expect(slots).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', 'A', 'B', 'C']);
    await expect(registerSelf(db, who(12))).rejects.toMatchObject({ status: 409 });
    const s = await loadState(db);
    expect(s.app.divisions.femmes.competitors.filter((c) => c.status === 'active')).toHaveLength(8);
    expect(s.app.divisions.femmes.competitors.filter((c) => c.status === 'alternate')).toHaveLength(3);
  });

  it('keeps first name, phone and initials out of the public snapshot', async () => {
    const db = createTestDb();
    await registerSelf(db, who(1));
    const s = await loadState(db);
    const dump = JSON.stringify(s);
    expect(dump).not.toContain('816-555-0100');
    expect(dump).not.toContain('Person1');
    const [competitor] = s.app.divisions.femmes.competitors;
    expect(Object.keys(competitor).sort()).toEqual(['id', 'name', 'status']);
    const contacts = await getContacts(db, 'femmes');
    expect(contacts[competitor.id]).toEqual({ firstName: 'Person1', phone: '816-555-0100', initials: 'AB' });
  });

  it('validates input and rejects duplicate ring names', async () => {
    const db = createTestDb();
    await registerSelf(db, who(1));
    await expect(registerSelf(db, { ...who(2), ringName: 'fighter 1' })).rejects.toMatchObject({ status: 400 });
    await expect(registerSelf(db, { ...who(2), ringName: '  ' })).rejects.toMatchObject({ status: 400 });
    await expect(registerSelf(db, { ...who(2), firstName: '' })).rejects.toMatchObject({ status: 400 });
    await expect(registerSelf(db, { ...who(2), phone: 'abc' })).rejects.toMatchObject({ status: 400 });
    await expect(registerSelf(db, { ...who(2), initials: '12' })).rejects.toMatchObject({ status: 400 });
    await expect(registerSelf(db, { ...who(2), division: 'nope' })).rejects.toMatchObject({ status: 400 });
    expect((await loadState(db)).app.divisions.femmes.competitors).toHaveLength(1);
  });

  it('ignores honeypot submissions without storing anything', async () => {
    const db = createTestDb();
    await registerSelf(db, { ...who(1), website: 'http://spam.example' });
    expect((await loadState(db)).app.divisions.femmes.competitors).toHaveLength(0);
  });

  it('is locked once the bracket has started', async () => {
    const db = createTestDb();
    for (let i = 1; i <= 8; i++) await registerSelf(db, who(i));
    await startDivision(db, 'femmes', (await loadState(db)).version);
    await expect(registerSelf(db, who(9))).rejects.toMatchObject({ status: 409 });
  });

  it('handles simultaneous sign-ups without losing anyone', async () => {
    const db = createTestDb();
    const results = await Promise.allSettled([1, 2, 3, 4].map((i) => registerSelf(db, who(i))));
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    expect((await loadState(db)).app.divisions.femmes.competitors).toHaveLength(ok);
    expect(ok).toBeGreaterThan(0);
  });

  it('clears contacts on reset', async () => {
    const db = createTestDb();
    await registerSelf(db, who(1));
    await seedTournament(db, { start: true });
    await resetTournament(db, { start: true });
    expect(await getContacts(db, 'femmes')).toEqual({});
    await deleteAllContacts(db);
  });
});
