'use client';

import { Status } from 'brackets-model';
import { BracketViewer } from './bracket-viewer.tsx';
import { Badge } from '@/components/ui/badge';
import { DIVISION_NAMES } from '../lib/tournament/constants.ts';
import { championName, matchLabel, participantName } from '../lib/tournament/selectors.ts';
import { useTournamentState } from '../lib/use-tournament-state.ts';

const STATUS_TEXT: Record<number, string> = {
  [Status.Locked]: 'Waiting for earlier matches',
  [Status.Waiting]: 'Waiting for opponent',
  [Status.Ready]: 'Up next',
  [Status.Running]: 'Underway',
  [Status.Completed]: 'Completed',
  [Status.Archived]: 'Completed',
};

export function AudienceDisplay() {
  const { state, offline } = useTournamentState();
  if (!state) return <main className="p-10 label">Loading…</main>;

  const { app, brackets } = state;
  const { division, mode, matchId } = app.display;
  const stageId = app.divisions[division].stageId;
  const match = matchId === null ? undefined : brackets.match.find((m) => m.id === matchId);

  return (
    <main className="mx-auto max-w-[1800px] p-6">
      <div className="panel min-h-[70vh]">
        <h1 className="m-0 mb-6 text-5xl">{DIVISION_NAMES[division]}</h1>
        {offline && (
          <Badge variant="destructive" role="status" className="mb-4">
            Connection lost — showing last known state
          </Badge>
        )}

        {mode === 'matchup' &&
          (match ? (
            <section className="py-10 text-center">
              <h2 className="label m-0 text-2xl">{matchLabel(brackets, match)}</h2>
              <div className="my-12 flex flex-wrap items-center justify-center gap-8 font-display text-7xl leading-tight xl:text-9xl">
                <span>{participantName(brackets, match.opponent1?.id) ?? 'TBD'}</span>
                <span className="label text-4xl text-denim">vs</span>
                <span>{participantName(brackets, match.opponent2?.id) ?? 'TBD'}</span>
              </div>
              <p className="m-0 label text-lg">{STATUS_TEXT[match.status]}</p>
            </section>
          ) : (
            <p className="py-32 text-center font-display text-6xl">Next match coming up…</p>
          ))}

        {mode === 'bracket' && <BracketViewer brackets={brackets} stageId={stageId} />}

        {mode === 'champion' && (
          <section className="band my-6 py-24 text-center">
            <h2 className="label m-0 text-3xl">Champion</h2>
            <p className="m-0 mt-8 font-display text-9xl">{championName(brackets, stageId) ?? '—'}</p>
          </section>
        )}
      </div>
    </main>
  );
}
