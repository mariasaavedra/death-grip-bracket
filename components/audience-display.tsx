'use client';

import { BracketViewer } from './bracket-viewer.tsx';
import { DIVISION_NAMES } from '../lib/tournament/constants.ts';
import { championName, matchLabel, participantName } from '../lib/tournament/selectors.ts';
import { useTournamentState } from '../lib/use-tournament-state.ts';
import { Status } from 'brackets-model';

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
  if (!state) return <main><p>Loading…</p></main>;

  const { app, brackets } = state;
  const { division, mode, matchId } = app.display;
  const stageId = app.divisions[division].stageId;
  const match = matchId === null ? undefined : brackets.match.find((m) => m.id === matchId);

  return (
    <main>
      <h1>{DIVISION_NAMES[division]}</h1>
      {offline && <p role="status">Connection lost — showing last known state.</p>}

      {mode === 'matchup' &&
        (match ? (
          <section>
            <h2>{matchLabel(brackets, match)}</h2>
            <p style={{ fontSize: '4rem' }}>
              {participantName(brackets, match.opponent1?.id) ?? 'TBD'} vs {participantName(brackets, match.opponent2?.id) ?? 'TBD'}
            </p>
            <p>{STATUS_TEXT[match.status]}</p>
          </section>
        ) : (
          <p style={{ fontSize: '3rem' }}>Next match coming up…</p>
        ))}

      {mode === 'bracket' && <BracketViewer brackets={brackets} stageId={stageId} />}

      {mode === 'champion' && (
        <section>
          <h2>Champion</h2>
          <p style={{ fontSize: '5rem' }}>{championName(brackets, stageId) ?? '—'}</p>
        </section>
      )}
    </main>
  );
}
