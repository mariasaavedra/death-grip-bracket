'use client';

import { useEffect, useId, useRef } from 'react';
import type { RoundNameGetter } from 'brackets-viewer/dist/types';
import type { BracketsData } from '../lib/tournament/types.ts';
import 'brackets-viewer/dist/brackets-viewer.min.css';

/** Round headers without the WB/LB prefix (the group heading already says which bracket). */
const roundName: RoundNameGetter = (info) => {
  if (info.groupType === 'final-group') return info.roundNumber === 2 ? 'Grand Final Reset' : 'Grand Final';
  return info.roundNumber === info.roundCount ? 'Final Round' : `Round ${info.roundNumber}`;
};

/** Renders one stage of native bracket data with brackets-viewer (browser only). */
export function BracketViewer({ brackets, stageId }: { brackets: BracketsData; stageId: number | null }) {
  const containerId = `bv-${useId().replace(/:/g, '')}`;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (stageId === null) return;
    let cancelled = false;
    (async () => {
      await import('brackets-viewer/dist/brackets-viewer.min.js');
      if (cancelled || !ref.current) return;
      const stage = brackets.stage.filter((s) => s.id === stageId);
      const participantIds = new Set<number | string>();
      const matches = brackets.match.filter((m) => m.stage_id === stageId);
      matches.forEach((m) => [m.opponent1?.id, m.opponent2?.id].forEach((id) => id != null && participantIds.add(id)));
      ref.current.innerHTML = '';
      // Rename the two bracket headings (deep-merged over the viewer's English strings).
      await window.bracketsViewer.addLocale('en', {
        common: { 'group-name-winner-bracket': 'Championship', 'group-name-loser-bracket': 'Elimination' },
      } as never);
      await window.bracketsViewer.render(
        {
          stages: stage,
          matches,
          matchGames: brackets.match_game.filter((g) => g.stage_id === stageId),
          participants: brackets.participant.filter((p) => participantIds.has(p.id)),
        },
        { selector: `#${containerId}`, clear: true, showLowerBracketSlotsOrigin: false, highlightParticipantOnHover: false, customRoundName: roundName },
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [brackets, stageId, containerId]);

  if (stageId === null) return <p>Bracket not created yet.</p>;
  return <div id={containerId} ref={ref} className="brackets-viewer" />;
}
