'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { DIVISION_NAMES } from '../lib/tournament/constants.ts';
import type { DivisionId } from '../lib/tournament/types.ts';
import type { VoteInfo } from '../lib/tournament/votes.ts';
import { useVoteInfo } from '../lib/use-vote-info.ts';

/** Voter-facing ballot (phones). One tap picks a ring name; tapping another changes the vote. */
export function Ballot({ division }: { division: DivisionId }) {
  const { info, setInfo } = useVoteInfo(division, 5000);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<string | null>(null);

  async function vote(competitorId: string) {
    setPending(competitorId);
    setError('');
    try {
      const res = await fetch('/api/vote', { method: 'POST', body: JSON.stringify({ division, competitorId }) });
      const json = (await res.json()) as VoteInfo & { error?: { message?: string } };
      if (res.ok) setInfo(json);
      else setError(json.error?.message ?? 'Could not record your vote');
    } catch {
      setError('Connection problem. Try again.');
    } finally {
      setPending(null);
    }
  }

  const candidates = [...(info?.candidates ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  const mine = candidates.find((c) => c.id === info?.myVote);

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-5">
      <p className="label m-0 text-sm text-denim">{DIVISION_NAMES[division]}</p>
      <h1 className="m-0 text-4xl">Vote for the best ring name</h1>

      {!info && <p>Loading…</p>}
      {info?.status === 'closed' && <p className="alert m-0">Voting is closed.</p>}
      {info?.status === 'open' && (
        <p className="m-0 text-muted-foreground">{mine ? `You voted for ${mine.name}. Tap another name to change your vote.` : 'Tap a name to vote.'}</p>
      )}
      {error && <p role="alert" className="alert m-0">{error}</p>}

      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {candidates.map((c) => (
          <li key={c.id}>
            <button
              disabled={info?.status !== 'open' || pending !== null}
              onClick={() => vote(c.id)}
              aria-pressed={info?.myVote === c.id}
              className={`flex min-h-16 w-full items-center justify-between rounded border border-ink px-4 text-left text-xl transition-colors disabled:opacity-60 ${
                info?.myVote === c.id ? 'bg-denim text-white' : 'bg-white/70 active:bg-mist'
              }`}
            >
              <span>{c.name}</span>
              {c.status === 'alternate' && <Badge variant="outline">Alternate</Badge>}
              {info?.myVote === c.id && <span className="label text-xs">Your vote ✓</span>}
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
