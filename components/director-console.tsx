'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import type { ReactNode } from 'react';
import type { Match } from 'brackets-model';
import { BracketViewer } from './bracket-viewer.tsx';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { OptionSelect } from './option-select.tsx';
import { Button } from '@/components/ui/button';
import { Card, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ACTIVE_LIMIT, ALTERNATE_LIMIT, DIVISION_IDS, DIVISION_NAMES } from '../lib/tournament/constants.ts';
import type { BracketSide } from '../lib/tournament/selectors.ts';
import { championName, completedMatches, eligibleMatches, eliminatedIds, matchLabel, matchSide, participantName, records, standings, stageMatches } from '../lib/tournament/selectors.ts';
import type { BracketsData, CompetitorStatus, DisplayMode, DivisionId, TournamentState } from '../lib/tournament/types.ts';
import { useTournamentState } from '../lib/use-tournament-state.ts';
import type { VoteInfo } from '../lib/tournament/votes.ts';
import { useVoteInfo } from '../lib/use-vote-info.ts';

type Id = number | string;

function WinnerName({ won, children }: { won: boolean; children: ReactNode }) {
  return won ? <mark className="rounded bg-denim px-1.5 py-0.5 font-semibold text-white">{children}</mark> : <span>{children}</span>;
}

/** Groups matches under their round label so each label is shown once. */
function groupByLabel(matches: Match[], label: (m: Match) => string): [string, Match[]][] {
  const groups = new Map<string, Match[]>();
  for (const m of matches) groups.set(label(m), [...(groups.get(label(m)) ?? []), m]);
  return [...groups];
}

/** One match as a two-row card; tapping a row picks that competitor, Confirm appears right under the card. */
function MatchCard({
  opponents,
  pickedId,
  onPick,
  onConfirm,
}: {
  opponents: { id: Id; name: string }[];
  pickedId: Id | null;
  onPick: (id: Id) => void;
  onConfirm: () => void;
}) {
  return (
    <Card className="w-full gap-0 py-0">
      {opponents.map((o, i) => (
        <button
          key={String(o.id)}
          aria-pressed={pickedId === o.id}
          onClick={() => onPick(o.id)}
          className={`flex min-h-14 w-full items-center justify-between px-4 text-left text-lg transition-colors ${i > 0 ? 'border-t border-border' : ''} ${
            pickedId === o.id ? 'bg-denim text-white' : 'hover:bg-mist'
          }`}
        >
          <span>{o.name}</span>
          <span className="label text-xs">{pickedId === o.id ? 'Winner ✓' : ''}</span>
        </button>
      ))}
      {pickedId !== null && (
        <CardFooter className="border-t bg-muted/50 p-2">
          <Button className="h-12 w-full text-base" onClick={onConfirm}>
            Confirm winner
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}

/** Winners and losers side by side; the grand final spans both columns underneath. */
function SideColumns({
  matches,
  brackets,
  render,
}: {
  matches: Match[];
  brackets: BracketsData;
  render: (label: string, group: Match[]) => ReactNode;
}) {
  const column = (side: BracketSide, title: string) => {
    const groups = groupByLabel(matches.filter((m) => matchSide(brackets, m) === side), (m) => matchLabel(brackets, m));
    return (
      <div>
        <h3 className="mb-1 border-b border-ink pb-1 text-denim">{title}</h3>
        {groups.length === 0 ? <p className="text-sm text-muted-foreground">None</p> : groups.map(([label, group]) => render(label, group))}
      </div>
    );
  };
  const final = groupByLabel(matches.filter((m) => matchSide(brackets, m) === 'final'), (m) => matchLabel(brackets, m));
  return (
    <div className="mt-4 grid gap-8 md:grid-cols-2">
      {column('winners', 'Winners bracket')}
      {column('losers', 'Losers bracket')}
      {final.length > 0 && <div className="md:col-span-2">{final.map(([label, group]) => render(label, group))}</div>}
    </div>
  );
}

/** Open/close/clear the best-ring-name vote for one division. Admin sees live counts. */
function VotingSection({ division }: { division: DivisionId }) {
  const { info, setInfo } = useVoteInfo(division, 3000);
  const [error, setError] = useState('');

  async function send(method: 'PATCH' | 'DELETE', body?: object) {
    const res = await fetch(`/api/vote/${division}`, { method, body: body ? JSON.stringify(body) : undefined });
    const json = (await res.json()) as VoteInfo & { error?: { message?: string } };
    if (res.ok) {
      setInfo(json);
      setError('');
    } else setError(json.error?.message ?? 'Request failed');
  }

  const ranked = [...(info?.candidates ?? [])].sort((a, b) => (info?.counts?.[b.id] ?? 0) - (info?.counts?.[a.id] ?? 0) || a.name.localeCompare(b.name));
  return (
    <section className="panel">
      <h2 className="mt-0 text-xl">Best ring name vote — {DIVISION_NAMES[division]}</h2>
      {error && <p role="alert" className="alert">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Badge className={info?.status === 'open' ? 'bg-green-600 text-white' : ''} variant={info?.status === 'open' ? 'default' : 'secondary'}>
          {info?.status === 'open' ? 'Voting open' : 'Voting closed'}
        </Badge>
        <span className="text-sm">{info?.total ?? 0} ballots</span>
        {info?.status === 'open' ? (
          <Button onClick={() => send('PATCH', { status: 'closed' })}>Close voting</Button>
        ) : (
          <Button onClick={() => send('PATCH', { status: 'open' })}>Open voting</Button>
        )}
        <button className="btn btn-sm btn-undo" onClick={() => window.confirm('Delete all ballots for this division?') && send('DELETE')}>
          Clear votes
        </button>
        <span className="text-sm text-muted-foreground">Voters use /vote/{division}</span>
      </div>
      <ul className="m-0 mt-3 list-none p-0 [&>li]:flex [&>li]:justify-between [&>li]:border-b [&>li]:border-ink/20 [&>li]:py-1.5">
        {ranked.map((c) => (
          <li key={c.id}>
            <span>{c.name}{c.status === 'alternate' ? ' (alternate)' : ''}</span>
            <strong>{info?.counts?.[c.id] ?? 0}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}

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
    <main className="mx-auto max-w-md p-10">
      <h1 className="text-2xl">Director login</h1>
      <form onSubmit={submit}>
        <Input className="mb-3 h-10 w-40" type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" autoFocus />
        <button className="btn" type="submit">Enter</button>
      </form>
      {error && <p role="alert" className="alert">{error}</p>}
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

  if (!state) return <main className="p-10 label">Loading…</main>;

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
  const eliminated = eliminatedIds(brackets, stageId);
  const recordOf = records(brackets, stageId);
  const rankOf = standings(brackets, stageId);
  // Once results exist, the roster is ordered by standing; alternates (no bracket slot) go last.
  const roster = div.competitors
    .map((c) => {
      const pid = brackets.participant.find((p) => p.name === c.name)?.id;
      return { c, pid, rank: pid === undefined ? undefined : rankOf?.get(pid) };
    })
    .sort((x, y) => (rankOf ? (x.rank ?? Infinity) - (y.rank ?? Infinity) || x.c.name.localeCompare(y.c.name) : 0));
  const displayStage = app.divisions[app.display.division].stageId;
  const showingGuide = app.display.mode === 'guide';
  // Voting controls follow what's on screen while the vote view is up; otherwise the division being managed.
  const votingDivision = app.display.mode === 'vote' ? app.display.division : division;
  const opponentName = (id: number | string | null | undefined) => participantName(brackets, id) ?? 'TBD';

  async function addCompetitor(e: FormEvent) {
    e.preventDefault();
    if (await call('POST', '/api/competitors', { division, name, status: newStatus })) setName('');
  }

  async function confirmWinner(m: Match) {
    if (winnerId === null || matchId !== m.id) return;
    if (await call('POST', `/api/matches/${m.id}/result`, { winnerId })) {
      setMatchId(null);
      setWinnerId(null);
    }
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <h1 className="m-0 text-2xl">Tournament director</h1>
      {offline && <p role="status" className="alert">Connection lost — retrying.</p>}
      {message && <p role="alert" className="alert">{message}</p>}

      <OptionSelect
        className="h-12 w-full max-w-md text-lg"
        value={division}
        onChange={(v) => { setDivision(v as DivisionId); setMatchId(null); setWinnerId(null); }}
        options={DIVISION_IDS.map((d) => ({ value: d, label: `${DIVISION_NAMES[d]} (${app.divisions[d].status})` }))}
      />

      <section className="panel">
        <h2 className="mt-0 text-xl">Display control</h2>
        <div className="flex flex-wrap items-center gap-3">
          <OptionSelect
            className="w-64"
            value={showingGuide ? 'guide' : app.display.division}
            onChange={(v) =>
              call('PATCH', '/api/display', v === 'guide' ? { mode: 'guide' } : { division: v, mode: showingGuide ? 'bracket' : app.display.mode })
            }
            options={[
              { value: 'guide', label: 'Guide', group: 'Event' },
              ...DIVISION_IDS.map((d) => ({ value: d, label: DIVISION_NAMES[d], group: 'Division' })),
            ]}
          />
          {!showingGuide && (
            <>
              <OptionSelect
                className="w-40"
                value={app.display.mode}
                onChange={(v) => call('PATCH', '/api/display', { mode: v as DisplayMode })}
                options={[
                  { value: 'matchup', label: 'Matchup' },
                  { value: 'bracket', label: 'Bracket' },
                  { value: 'champion', label: 'Champion' },
                  { value: 'vote', label: 'Vote (best ring name)' },
                ]}
              />
              <OptionSelect
                className="w-72"
                value={app.display.matchId === null ? 'none' : String(app.display.matchId)}
                onChange={(v) => call('PATCH', '/api/display', { matchId: v === 'none' ? null : Number(v) })}
                options={[
                  { value: 'none', label: 'No match selected' },
                  ...stageMatches(brackets, displayStage)
                    .filter((m) => m.opponent1?.id != null || m.opponent2?.id != null)
                    .map((m) => ({
                      value: String(m.id),
                      group: matchLabel(brackets, m),
                      label: `${opponentName(m.opponent1?.id)} vs ${opponentName(m.opponent2?.id)}`,
                    })),
                ]}
              />
            </>
          )}
          {app.display.mode === 'vote' && (
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={app.display.showVotes} onCheckedChange={(checked) => call('PATCH', '/api/display', { showVotes: checked })} />
              Show vote results on display
            </label>
          )}
        </div>
      </section>

      {app.divisions[votingDivision].status !== 'registration' && <VotingSection key={votingDivision} division={votingDivision} />}

      <section className="panel">
        <h2 className="mt-0 text-xl">Registration — {DIVISION_NAMES[division]}</h2>
        <p>
          Active {active.length}/{ACTIVE_LIMIT} · Alternates {alternates.length}/{ALTERNATE_LIMIT}
        </p>
        <ul className="m-0 list-none p-0 [&>li]:border-b [&>li]:border-ink/20 [&>li]:py-2">
          {roster.map(({ c, pid, rank }) => {
            const r = (pid !== undefined && recordOf.get(pid)) || { wins: 0, losses: 0 };
            return (
              <li key={c.id} className="flex flex-wrap items-center gap-2">
                {rank !== undefined && <span className="label w-8 text-sm text-denim">#{rank}</span>}
                <span className="text-lg">{c.name}</span>
                {c.status === 'alternate' ? (
                  <Badge variant="secondary" className="bg-muted text-muted-foreground">Alternate</Badge>
                ) : pid !== undefined && eliminated.includes(pid) ? (
                  <Badge variant="destructive">Eliminated</Badge>
                ) : (
                  <Badge className="bg-green-600 text-white">Active</Badge>
                )}
                {stageId !== null && c.status === 'active' && (
                  <Badge variant="outline" title="Wins / losses">{r.wins}/{r.losses}</Badge>
                )}
                {div.status === 'registration' && (
                  <>
                    <button className="btn" onClick={() => { const n = window.prompt('Ring name', c.name); if (n !== null) call('PATCH', `/api/competitors/${c.id}`, { name: n }); }}>Rename</button>
                    <button className="btn" onClick={() => call('PATCH', `/api/competitors/${c.id}`, { status: c.status === 'active' ? 'alternate' : 'active' })}>
                      Make {c.status === 'active' ? 'alternate' : 'active'}
                    </button>
                    <button className="btn" onClick={() => call('DELETE', `/api/competitors/${c.id}`, {})}>Remove</button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
        {div.status === 'registration' && (
          <>
            <form onSubmit={addCompetitor} className="mt-3 flex flex-wrap items-center gap-2">
              <Input className="h-9 w-56" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ring name" />
              <OptionSelect
                className="w-36"
                value={newStatus}
                onChange={(v) => setNewStatus(v as CompetitorStatus)}
                options={[{ value: 'active', label: 'Active' }, { value: 'alternate', label: 'Alternate' }]}
              />
              <button className="btn" type="submit">Add</button>
            </form>
            <button className="btn" disabled={active.length !== ACTIVE_LIMIT} onClick={() => call('POST', `/api/divisions/${division}/start`, {})}>
              Start bracket
            </button>
          </>
        )}
      </section>

      {div.status !== 'registration' && (
        <section className="panel">
          <h2 className="mt-0 text-xl">Match control</h2>
          {div.status === 'completed' && <p>Champion: <strong>{championName(brackets, stageId)}</strong></p>}
          <Tabs defaultValue="ready" className="mt-4">
            <TabsList>
              <TabsTrigger value="ready">Ready ({eligible.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({done.length})</TabsTrigger>
              <TabsTrigger value="bracket">Bracket</TabsTrigger>
            </TabsList>
            <TabsContent value="ready">
          {eligible.length === 0 && <p>No matches ready right now.</p>}
          <SideColumns
            matches={eligible}
            brackets={brackets}
            render={(label, matches) => (
              <div key={label}>
                <h3 className="mb-2 mt-4">{label}</h3>
                <div className="flex flex-col gap-3">
                  {matches.map((m) => (
                    <MatchCard
                      key={String(m.id)}
                      opponents={[m.opponent1, m.opponent2].map((o) => ({ id: o!.id!, name: opponentName(o!.id) }))}
                      pickedId={matchId === m.id ? winnerId : null}
                      onPick={(id) => { setMatchId(Number(m.id)); setWinnerId(id); }}
                      onConfirm={() => confirmWinner(m)}
                    />
                  ))}
                </div>
              </div>
            )}
          />
            </TabsContent>
            <TabsContent value="completed">
          {done.length === 0 && <p>No results yet.</p>}
          <SideColumns
            matches={done}
            brackets={brackets}
            render={(label, matches) => (
              <div key={label}>
                <h3 className="mb-1 mt-4">{label}</h3>
                <ul className="m-0 list-none p-0 [&>li]:border-b [&>li]:border-ink/20 [&>li]:py-2">
                  {matches.map((m) => (
                    <li key={String(m.id)}>
                      <div className="text-lg">
                        <WinnerName won={m.opponent1?.result === 'win'}>{opponentName(m.opponent1?.id)}</WinnerName>
                        <span className="label mx-2 text-xs text-muted-foreground">vs</span>
                        <WinnerName won={m.opponent2?.result === 'win'}>{opponentName(m.opponent2?.id)}</WinnerName>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-3 text-sm">
                        <span>
                          Winner: <strong>{opponentName(m.opponent1?.result === 'win' ? m.opponent1.id : m.opponent2?.id)}</strong>
                        </span>
                        <button className="btn btn-sm btn-undo" onClick={() => window.confirm('Clear this result?') && call('POST', `/api/matches/${m.id}/reset`, {})}>Undo</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          />
            </TabsContent>
            <TabsContent value="bracket">
              <BracketViewer brackets={brackets} stageId={stageId} />
            </TabsContent>
          </Tabs>
        </section>
      )}
    </main>
  );
}
