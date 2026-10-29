import { describe, expect, it } from 'vitest';
import { createTestDb } from './test-db.ts';
import { resetTournament, seedTournament } from './seed.ts';
import { loadState } from './storage.ts';
import { setDisplay } from './service.ts';
import { castVote, clearVotes, getVoteInfo, setVotingStatus, tally, winners } from './votes.ts';

const V1 = '11111111-1111-4111-8111-111111111111';
const V2 = '22222222-2222-4222-8222-222222222222';

async function seeded() {
  const db = createTestDb();
  await seedTournament(db);
  const s = await loadState(db);
  return { db, ids: s.app.divisions.femmes.competitors.map((c) => c.id) };
}
const info = (db: D1Database, voterId: string | null = null, isAdmin = true) => getVoteInfo(db, 'femmes', { voterId, isAdmin });

describe('voting', () => {
  it('starts closed and rejects votes until the director opens it', async () => {
    const { db, ids } = await seeded();
    expect((await info(db)).status).toBe('closed');
    await expect(castVote(db, 'femmes', V1, ids[0])).rejects.toMatchObject({ status: 409 });
    await setVotingStatus(db, 'femmes', 'open');
    await castVote(db, 'femmes', V1, ids[0]);
    expect((await info(db, V1)).myVote).toBe(ids[0]);
  });

  it('keeps one ballot per voter and lets them change it', async () => {
    const { db, ids } = await seeded();
    await setVotingStatus(db, 'femmes', 'open');
    await castVote(db, 'femmes', V1, ids[0]);
    await castVote(db, 'femmes', V1, ids[1]);
    await castVote(db, 'femmes', V2, ids[1]);
    const i = await info(db, V1);
    expect(i.total).toBe(2);
    expect(i.counts![ids[0]]).toBe(0);
    expect(i.counts![ids[1]]).toBe(2);
    expect(i.myVote).toBe(ids[1]);
  });

  it('rejects invalid voters and competitors, and votes after closing', async () => {
    const { db, ids } = await seeded();
    await setVotingStatus(db, 'femmes', 'open');
    await expect(castVote(db, 'femmes', 'not-a-uuid', ids[0])).rejects.toMatchObject({ status: 400 });
    await expect(castVote(db, 'femmes', V1, 'nobody')).rejects.toMatchObject({ status: 400 });
    // A mascs competitor is not on the femmes ballot.
    const mascs = (await loadState(db)).app.divisions.mascs.competitors[0].id;
    await expect(castVote(db, 'femmes', V1, mascs)).rejects.toMatchObject({ status: 400 });
    await castVote(db, 'femmes', V1, ids[0]);
    await setVotingStatus(db, 'femmes', 'closed');
    await expect(castVote(db, 'femmes', V2, ids[0])).rejects.toMatchObject({ status: 409 });
    expect((await info(db)).total).toBe(1);
  });

  it('never touches the tournament version', async () => {
    const { db, ids } = await seeded();
    const before = (await loadState(db)).version;
    await setVotingStatus(db, 'femmes', 'open');
    await castVote(db, 'femmes', V1, ids[0]);
    await clearVotes(db, 'femmes');
    expect((await loadState(db)).version).toBe(before);
  });

  it('lists every registered competitor on the ballot', async () => {
    const { db } = await seeded();
    const i = await info(db);
    expect(i.candidates).toHaveLength(8);
  });

  it('hides counts from the public until the director reveals them', async () => {
    const { db, ids } = await seeded();
    await setVotingStatus(db, 'femmes', 'open');
    await castVote(db, 'femmes', V1, ids[0]);
    expect((await info(db, V1, false)).counts).toBeUndefined();
    let s = await loadState(db);
    s = await setDisplay(db, { division: 'femmes', mode: 'vote', expectedVersion: s.version });
    expect((await info(db, V1, false)).counts).toBeUndefined();
    await setDisplay(db, { showVotes: true, expectedVersion: s.version });
    const shown = await info(db, V1, false);
    expect(shown.resultsVisible).toBe(true);
    expect(shown.counts![ids[0]]).toBe(1);
  });

  it('only allows the vote view for a started division', async () => {
    const db = createTestDb();
    const s = await loadState(db);
    await expect(setDisplay(db, { mode: 'vote', expectedVersion: s.version })).rejects.toMatchObject({ status: 409 });
    await expect(setVotingStatus(db, 'femmes', 'open')).rejects.toMatchObject({ status: 409 });
  });

  it('reports every tied winner and clears on reset', async () => {
    const { db, ids } = await seeded();
    await setVotingStatus(db, 'femmes', 'open');
    await castVote(db, 'femmes', V1, ids[0]);
    await castVote(db, 'femmes', V2, ids[1]);
    const i = await info(db);
    expect(winners(i.counts!).sort()).toEqual([ids[0], ids[1]].sort());
    expect(winners(tally({}, i.candidates))).toEqual([]);
    await resetTournament(db);
    const after = await info(db);
    expect(after.total).toBe(0);
    expect(after.status).toBe('closed');
  });
});
