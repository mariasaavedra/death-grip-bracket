'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DivisionId } from './tournament/types.ts';
import type { VoteInfo } from './tournament/votes.ts';

/** Polls the vote endpoint for one division. Keeps the last info while offline. */
export function useVoteInfo(division: DivisionId, intervalMs: number) {
  const [info, setInfo] = useState<VoteInfo | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/vote/${division}`, { cache: 'no-store' });
      if (res.ok) setInfo(await res.json());
    } catch {
      /* keep last known info */
    }
  }, [division]);

  useEffect(() => {
    const first = setTimeout(refresh, 0);
    const timer = setInterval(refresh, intervalMs);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [refresh, intervalMs]);

  return { info, setInfo, refresh };
}
