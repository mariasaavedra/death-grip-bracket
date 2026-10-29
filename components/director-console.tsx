'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { BracketViewer } from './bracket-viewer.tsx';
import { ACTIVE_LIMIT, ALTERNATE_LIMIT, DIVISION_IDS, DIVISION_NAMES } from '../lib/tournament/constants.ts';
import { championName, completedMatches, eligibleMatches, eliminatedIds, matchLabel, participantName, stageMatches } from '../lib/tournament/selectors.ts';
import type { CompetitorStatus, DisplayMode, DivisionId, TournamentState } from '../lib/tournament/types.ts';
import { useTournamentState } from '../lib/use-tournament-state.ts';

function Login() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/auth', { method: 'POST', body: JSON.stringify({ pin }) });
    if (res.ok) location.reload();
    else setError('Incorrect PIN');
  }
  return (
    <main>
      <h1>Director login</h1>
      <form onSubmit={submit}>
        <input type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" autoFocus />
        <button type="submit">Enter</button>
      </form>
      {error && <p role="alert">{error}</p>}
    </main>
  );
}

export function DirectorConsole({ authed }: { authed: boolean }) {
  if (!authed) return <Login />;
  return <Console />;
}

function Console() {
  const { state, offline, setState, refresh } = useTournamentState();
  const [division, setDivision] = useState<DivisionId>('femmes');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [newStatus, setNewStatus] = useState<CompetitorStatus>('active');
  const [matchId, setMatchId] = useState<number | null>(null);
  const [winnerId, setWinnerId] = useState<number | string | null>(null);

  if (!state) return <main><p>Loading…</p></main>;

  /** All writes go through here: sends the revision we last saw and handles 409 explicitly (never retried). */
  async function call(method: string, url: string, body: Record<string, unknown>): Promise<boolean> {
    const res = await fetch(url, { method, body: JSON.stringify({ ...body, expectedVersion: state!.version }) });
    const json = (await res.json()) as TournamentState & { error?: { message?: string } };
    if (res.ok) {
      setState(json);
      setMessage('');
      return true;
    }
    setMessage(json.error?.message ?? 'Request failed');
    if (res.status === 409) {
      setWinnerId(null);
      await refresh();
    }
    return false;
  }

  const { app, brackets } = state;
  const div = app.divisions[division];
  const stageId = div.stageId;
  const active = div.competitors.filter((c) => c.status === 'active');
  const alternates = div.competitors.filter((c) => c.status === 'alternate');
  const eligible = eligibleMatches(brackets, stageId);
  const done = completedMatches(brackets, stageId);
  const selected = eligible.find((m) => m.id === matchId);
  const eliminated = eliminatedIds(brackets, stageId);
  const displayStage = app.divisions[app.display.division].stageId;
  const opponentName = (id: number | string | null | undefined) => participantName(brackets, id) ?? 'TBD';

  async function addCompetitor(e: FormEvent) {
    e.preventDefault();
    if (await call('POST', '/api/competitors', { division, name, status: newStatus })) setName('');
  }

  async function confirmWinner() {
    if (!selected || winnerId === null) return;
    const who = opponentName(winnerId);
    if (!window.confirm(`Record ${who} as the winner of ${matchLabel(brackets, selected)}?`)) return;
    if (await call('POST', `/api/matches/${selected.id}/result`, { winnerId })) {
      setMatchId(null);
      setWinnerId(null);
    }
  }

  return (
    <main>
      <h1>Tournament director</h1>
      {offline && <p role="status">Connection lost — retrying.</p>}
      {message && <p role="alert">{message}</p>}

      <p>
        {DIVISION_IDS.map((d) => (
          <button key={d} disabled={d === division} onClick={() => { setDivision(d); setMatchId(null); setWinnerId(null); }}>
            {DIVISION_NAMES[d]} ({app.divisions[d].status})
          </button>
        ))}
      </p>

      <section>
        <h2>Registration — {DIVISION_NAMES[division]}</h2>
        <p>
          Active {active.length}/{ACTIVE_LIMIT} · Alternates {alternates.length}/{ALTERNATE_LIMIT}
        </p>
        <ul>
          {div.competitors.map((c) => (
            <li key={c.id}>
              {c.name} [{c.status}]{' '}
              {div.status === 'registration' ? (
                <>
                  <button onClick={() => { const n = window.prompt('Ring name', c.name); if (n !== null) call('PATCH', `/api/competitors/${c.id}`, { name: n }); }}>Rename</button>
                  <button onClick={() => call('PATCH', `/api/competitors/${c.id}`, { status: c.status === 'active' ? 'alternate' : 'active' })}>
                    Make {c.status === 'active' ? 'alternate' : 'active'}
                  </button>
                  <button onClick={() => call('DELETE', `/api/competitors/${c.id}`, {})}>Remove</button>
                </>
              ) : (
                c.status === 'active' && stageId !== null && eliminated.includes(brackets.participant.find((p) => p.name === c.name)?.id ?? -1) && <em>eliminated</em>
              )}
            </li>
          ))}
        </ul>
        {div.status === 'registration' && (
          <>
            <form onSubmit={addCompetitor}>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ring name" />
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value as CompetitorStatus)}>
                <option value="active">Active</option>
                <option value="alternate">Alternate</option>
              </select>
              <button type="submit">Add</button>
            </form>
            <button disabled={active.length !== ACTIVE_LIMIT} onClick={() => call('POST', `/api/divisions/${division}/start`, {})}>
              Start bracket
            </button>
          </>
        )}
      </section>

      {div.status !== 'registration' && (
        <section>
          <h2>Match control</h2>
          {div.status === 'completed' && <p>Champion: <strong>{championName(brackets, stageId)}</strong></p>}
          <h3>Eligible matches</h3>
          {eligible.length === 0 && <p>None right now.</p>}
          <ul>
            {eligible.map((m) => (
              <li key={String(m.id)}>
                <button disabled={m.id === matchId} onClick={() => { setMatchId(Number(m.id)); setWinnerId(null); }}>
                  {matchLabel(brackets, m)}: {opponentName(m.opponent1?.id)} vs {opponentName(m.opponent2?.id)}
                </button>
              </li>
            ))}
          </ul>
          {selected && (
            <div>
              <h3>Select winner — {matchLabel(brackets, selected)}</h3>
              {[selected.opponent1, selected.opponent2].map((o) => (
                <button key={String(o!.id)} aria-pressed={winnerId === o!.id} onClick={() => setWinnerId(o!.id)}>
                  {winnerId === o!.id ? '✓ ' : ''}{opponentName(o!.id)}
                </button>
              ))}
              <p><button disabled={winnerId === null} onClick={confirmWinner}>Confirm winner</button></p>
            </div>
          )}
          <h3>Completed matches (correct a result)</h3>
          <ul>
            {done.map((m) => (
              <li key={String(m.id)}>
                {matchLabel(brackets, m)}: {opponentName(m.opponent1?.id)} vs {opponentName(m.opponent2?.id)} — winner{' '}
                {opponentName(m.opponent1?.result === 'win' ? m.opponent1.id : m.opponent2?.id)}{' '}
                <button onClick={() => window.confirm('Clear this result?') && call('POST', `/api/matches/${m.id}/reset`, {})}>Undo</button>
              </li>
            ))}
          </ul>
          <h3>Bracket</h3>
          <BracketViewer brackets={brackets} stageId={stageId} />
        </section>
      )}

      <section>
        <h2>Display control</h2>
        <p>
          Public division:{' '}
          <select value={app.display.division} onChange={(e) => call('PATCH', '/api/display', { division: e.target.value })}>
            {DIVISION_IDS.map((d) => <option key={d} value={d}>{DIVISION_NAMES[d]}</option>)}
          </select>{' '}
          Mode:{' '}
          <select value={app.display.mode} onChange={(e) => call('PATCH', '/api/display', { mode: e.target.value as DisplayMode })}>
            <option value="matchup">Matchup</option>
            <option value="bracket">Bracket</option>
            <option value="champion">Champion</option>
          </select>{' '}
          Match:{' '}
          <select
            value={app.display.matchId ?? ''}
            onChange={(e) => call('PATCH', '/api/display', { matchId: e.target.value === '' ? null : Number(e.target.value) })}
          >
            <option value="">None</option>
            {stageMatches(brackets, displayStage)
              .filter((m) => m.opponent1?.id != null || m.opponent2?.id != null)
              .map((m) => (
                <option key={String(m.id)} value={String(m.id)}>
                  {matchLabel(brackets, m)}: {opponentName(m.opponent1?.id)} vs {opponentName(m.opponent2?.id)}
                </option>
              ))}
          </select>
        </p>
      </section>
    </main>
  );
}
