'use client';

import { useEffect, useId, useRef } from 'react';
import type { BracketsData } from '../lib/tournament/types.ts';
import 'brackets-viewer/dist/brackets-viewer.min.css';

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
      await window.bracketsViewer.render(
        {
          stages: stage,
          matches,
          matchGames: brackets.match_game.filter((g) => g.stage_id === stageId),
          participants: brackets.participant.filter((p) => participantIds.has(p.id)),
        },
        { selector: `#${containerId}`, clear: true },
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [brackets, stageId, containerId]);

  if (stageId === null) return <p>Bracket not created yet.</p>;
  return <div id={containerId} ref={ref} className="brackets-viewer" />;
}

declare global {
  interface Window {
    bracketsViewer: { render(data: unknown, config?: Record<string, unknown>): Promise<void> };
  }
}
