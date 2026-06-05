import { usePlayerStore } from '@/stores/player-store/player.store';

/** Bumps a token so open History refetches after play/pause, skip, or seek. */
export function bumpListenHistoryRefresh(): void {
  usePlayerStore.setState((state) => ({
    listenHistoryRefreshToken: state.listenHistoryRefreshToken + 1,
  }));
}
