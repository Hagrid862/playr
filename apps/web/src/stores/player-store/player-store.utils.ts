import { afterLocalPlaybackMutationWithClaim } from '@/lib/playback-sync';
import type { QueueItem } from '@repo/contracts';
import type { PlayerState } from './player-store.types';

export function reindexQueuePositions(queue: QueueItem[]): QueueItem[] {
  return queue.map((item, i) => ({ ...item, position: i, originalPosition: i }));
}

export function shouldClaimActiveDevice(
  activeDeviceId: string | null,
  localPlaybackDeviceId: string,
) {
  return (
    activeDeviceId == null || activeDeviceId === '' || activeDeviceId === localPlaybackDeviceId
  );
}

/** When editing queue structure, exit shuffle and restore the pre-shuffle snapshot. */
export function unshuffleBaseline(
  state: Pick<PlayerState, 'queue' | 'originalQueue' | 'isShuffled'>,
): {
  queue: QueueItem[];
  originalQueue: QueueItem[];
  isShuffled: boolean;
} {
  if (!state.isShuffled) {
    return { queue: state.queue, originalQueue: state.originalQueue, isShuffled: false };
  }
  return {
    queue: state.originalQueue.map((q) => ({ ...q })),
    originalQueue: [],
    isShuffled: false,
  };
}

export function flushPlaybackClaimAfterLocalMutation(get: () => PlayerState): void {
  afterLocalPlaybackMutationWithClaim(
    shouldClaimActiveDevice(get().activeDeviceId, get().localPlaybackDeviceId),
  );
}
