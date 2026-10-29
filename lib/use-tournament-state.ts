'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { POLL_INTERVAL_MS } from './tournament/constants.ts';
import type { TournamentState } from './tournament/types.ts';

/** Polls /api/state every 2s; only swaps state when the revision changes; keeps last state while offline. */
export function useTournamentState() {
  const [state, setStateRaw] = useState<TournamentState | null>(null);
  const [offline, setOffline] = useState(false);
  const versionRef = useRef(-1);

  const setState = useCallback((next: TournamentState) => {
    if (next.version === versionRef.current) return;
    versionRef.current = next.version;
    setStateRaw(next);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/state', { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      setState(await res.json());
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, [setState]);

  useEffect(() => {
    const first = setTimeout(refresh, 0);
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [refresh]);

  return { state, offline, setState, refresh };
}
