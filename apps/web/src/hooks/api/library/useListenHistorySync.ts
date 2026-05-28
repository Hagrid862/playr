import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/player-store/player.store';
import { mergeListenHistoryFirstPage } from './mergeListenHistoryFirstPage';

const REFRESH_DEBOUNCE_MS = 400;

type Params = {
  enabled: boolean;
  limit?: number;
};

/**
 * When History is open, refetch page 1 after play/pause, skip, or seek (via listenHistoryRefreshToken).
 * Does nothing while History is closed.
 */
export function useListenHistorySync({ enabled, limit = 20 }: Params) {
  const queryClient = useQueryClient();
  const { listenHistoryRefreshToken } = usePlayerStore();
  const lastSeenTokenRef = useRef(listenHistoryRefreshToken);

  useEffect(() => {
    if (!enabled) {
      lastSeenTokenRef.current = listenHistoryRefreshToken;
      return;
    }

    if (listenHistoryRefreshToken === lastSeenTokenRef.current) {
      return;
    }

    lastSeenTokenRef.current = listenHistoryRefreshToken;

    const timer = setTimeout(() => {
      void mergeListenHistoryFirstPage(queryClient, limit).catch(() => {
        // Non-critical: keep showing cached history
      });
    }, REFRESH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [enabled, listenHistoryRefreshToken, limit, queryClient]);
}
