import { describe, expect, it } from 'vitest';
import { createTestDb } from './test-db.ts';
import { seedTournament } from './seed.ts';
import { loadState } from './storage.ts';
import { recordResult, resetMatch } from './service.ts';
import { playOut } from './play.test-helper.ts';
import { championName, eligibleMatches, eliminatedIds, lossCounts, matchWinnerId, participantName, stageMatches } from './selectors.ts';

async function seeded() {
  const db = createTestDb();
  await seedTournament(db);
  return db;
}

describe('bracket generation', () => {
  it('creates two distinct 8-person double-elimination stages with double grand final', async () => {
    const s = await loadState(await seeded());
    expect(s.brackets.stage).toHaveLength(2);
    const [a, b] = s.brackets.stage;
    expect(a.id).not.toBe(b.id);
    for (const st of s.brackets.stage) {
      expect(st.type).toBe('double_elimination');
      expect(st.settings.grandFinal).toBe('double');
      expect(st.settings.size).toBe(8);
    }
    expect(s.brackets.participant).toHaveLength(16);
    expect(stageMatches(s.brackets, s.app.divisions.femmes.stageId).every((m) => matchWinnerId(m) === null)).toBe(true);
    expect(eligibleMatches(s.brackets, s.app.divisions.femmes.stageId)).toHaveLength(4);
    expect(s.app.divisions.femmes.stageId).toBe(Number(a.id));
  });
});

describe('winners and losers brackets', () => {
  it('first loss drops to losers bracket, second loss eliminates', async () => {
    const db = await seeded();
    let s = await loadState(db);
    const stageId = s.app.divisions.femmes.stageId;
    const [m] = eligibleMatches(s.brackets, stageId);
    const loser = m.opponent2!.id!;
    s = await recordResult(db, Number(m.id), m.opponent1!.id, s.version);
    expect(lossCounts(s.brackets, stageId).get(loser)).toBe(1);
    expect(eliminatedIds(s.brackets, stageId)).not.toContain(loser);
    // The loser now sits in a losers-bracket match.
    const lb = s.brackets.group.find((g) => g.stage_id === stageId && g.number === 2)!;
    expect(s.brackets.match.some((x) => x.group_id === lb.id && (x.opponent1?.id === loser || x.opponent2?.id === loser))).toBe(true);
  });

  it('plays a full bracket; every non-champion ends with at least one loss and second losses eliminate', async () => {
    const db = await seeded();
    const s = await playOut(db, 'femmes', () => 1);
    const stageId = s.app.divisions.femmes.stageId;
    expect(eliminatedIds(s.brackets, stageId)).toHaveLength(7);
    expect(s.app.divisions.femmes.status).toBe('completed');
    expect(s.app.divisions.mascs.status).toBe('active');
  });
});

describe('grand final', () => {
  it('A: undefeated finalist wins first grand final, no reset needed', async () => {
    const db = await seeded();
    const s = await playOut(db, 'mascs', () => 1);
    const stageId = s.app.divisions.mascs.stageId;
    expect(championName(s.brackets, stageId)).not.toBeNull();
    expect(eligibleMatches(s.brackets, stageId)).toHaveLength(0);
    expect(lossCounts(s.brackets, stageId).get(s.brackets.participant.find((p) => p.name === championName(s.brackets, stageId))!.id)).toBeUndefined();
    expect(s.app.divisions.mascs.status).toBe('completed');
  });

  it('B: one-loss finalist wins first grand final, reset decides the champion', async () => {
    const db = await seeded();
    let s = await playOut(db, 'mascs', (label) => (label === 'Grand Final' ? 2 : 1), 14);
    const stageId = s.app.divisions.mascs.stageId;
    expect(s.app.divisions.mascs.status).toBe('active');
    expect(championName(s.brackets, stageId)).toBeNull();
    const [reset] = eligibleMatches(s.brackets, stageId);
    expect(reset).toBeDefined();
    const winner = reset.opponent1!.id;
    s = await recordResult(db, Number(reset.id), winner, s.version);
    expect(championName(s.brackets, stageId)).toBe(participantName(s.brackets, winner));
    expect(s.app.divisions.mascs.status).toBe('completed');
  });
});

describe('result correction', () => {
  it('resets the latest result and rejects resets with completed dependents', async () => {
    const db = await seeded();
    let s = await loadState(db);
    const stageId = s.app.divisions.femmes.stageId;
    const first = eligibleMatches(s.brackets, stageId);
    for (const m of first) s = await recordResult(db, Number(m.id), m.opponent1!.id, s.version);
    const [next] = eligibleMatches(s.brackets, stageId);
    s = await recordResult(db, Number(next.id), next.opponent1!.id, s.version);
    // A round-1 match now feeds a completed match: must be rejected, state untouched.
    await expect(resetMatch(db, Number(first[0].id), s.version)).rejects.toMatchObject({ status: 409 });
    expect((await loadState(db)).version).toBe(s.version);
    // The latest match can be corrected.
    s = await resetMatch(db, Number(next.id), s.version);
    expect(matchWinnerId(s.brackets.match.find((m) => m.id === next.id)!)).toBeNull();
    expect(eligibleMatches(s.brackets, stageId).some((m) => m.id === next.id)).toBe(true);
  });
});
