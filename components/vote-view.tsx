'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { QrCode } from './qr-code.tsx';
import { DIVISION_NAMES } from '../lib/tournament/constants.ts';
import type { DivisionId } from '../lib/tournament/types.ts';
import { winners } from '../lib/tournament/votes.ts';
import { useVoteInfo } from '../lib/use-vote-info.ts';

/** Display view: scan-to-vote QR plus every ring name; results appear when the director reveals them. */
export function VoteView({ division }: { division: DivisionId }) {
  const { info } = useVoteInfo(division, 2000);
  const [origin, setOrigin] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setOrigin(window.location.origin), 0);
    return () => clearTimeout(t);
  }, []);

  const url = `${origin}/vote/${division}`;
  // Only ever show counts the director has revealed, even if this browser also holds an admin cookie.
  const counts = info?.resultsVisible ? info.counts : undefined;
  const max = Math.max(1, ...Object.values(counts ?? {}));
  const top = counts && info?.status === 'closed' ? winners(counts) : [];
  const candidates = [...(info?.candidates ?? [])].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="label m-0 text-sm text-denim">{DIVISION_NAMES[division]}</p>
        <h2 className="m-0 font-display text-6xl xl:text-7xl">Vote for the best ring name</h2>
        {info?.status === 'open' && origin ? (
          <>
            <QrCode value={url} className="w-64 border border-ink xl:w-80" />
            <p className="label m-0 text-sm">Scan to vote</p>
            <p className="m-0 text-sm text-muted-foreground">{url.replace(/^https?:\/\//, '')}</p>
          </>
        ) : (
          <p className="label m-0 mt-6 text-2xl">{info?.status === 'closed' ? 'Voting is closed' : 'Loading…'}</p>
        )}
      </div>

      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
        {candidates.map((c) => {
          const n = counts?.[c.id] ?? 0;
          const winner = top.includes(c.id);
          return (
            <li key={c.id} className={`border border-ink p-4 ${winner ? 'bg-denim text-white' : 'bg-white/60'}`}>
              <div className="flex items-center justify-between gap-2 text-2xl xl:text-3xl">
                <span className={winner ? 'font-bold' : ''}>{c.name}</span>
                {c.status === 'alternate' && <Badge variant="outline">Alternate</Badge>}
              </div>
              {counts && (
                <Progress
                  value={(n / max) * 100}
                  className="mt-3 [&_[data-slot=progress-indicator]]:bg-denim [&_[data-slot=progress-track]]:h-2 [&_[data-slot=progress-track]]:rounded-[2px] [&_[data-slot=progress-track]]:bg-ink/15 [&_[data-slot=progress-indicator]]:rounded-[2px]"
                >
                  <span className="label text-sm">{n} {n === 1 ? 'vote' : 'votes'}{winner ? ' — winner' : ''}</span>
                </Progress>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
