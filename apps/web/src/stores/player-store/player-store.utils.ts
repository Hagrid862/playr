import { afterLocalPlaybackMutationWithClaim } from '@/lib/playback/sync/playback-sync';
import type { QueueItem } from '@repo/contracts';
import type { PlayerState } from './player-store.types';

/**
 * Reindex the queue positions.
 * @param queue - The queue to reindex.
 * @returns The reindexed queue.
 */
export function reindexQueuePositions(queue: QueueItem[]): QueueItem[] {
  return queue.map((item, i) => ({ ...item, position: i, originalPosition: i }));
}

/**
 * Check if the active device should be claimed.
 * @param activeDeviceId - The id of the active device.
 * @param localPlaybackDeviceId - The id of the local playback device.
 * @returns True if the active device should be claimed, false otherwise.
 */
export function shouldClaimActiveDevice(
  activeDeviceId: string | null,
  localPlaybackDeviceId: string,
) {
  return (
    activeDeviceId == null || activeDeviceId === '' || activeDeviceId === localPlaybackDeviceId
  );
}

/**
 * Check if the active device is the local playback device.
 * @param activeDeviceId - The id of the active device.
 * @param localPlaybackDeviceId - The id of the local playback device.
 * @returns True if the active device is the local playback device, false otherwise.
 */
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

/**
 * Flush the playback claim after a local mutation.
 * @param get - The get function to get the player state.
 */
export function flushPlaybackClaimAfterLocalMutation(get: () => PlayerState): void {
  afterLocalPlaybackMutationWithClaim(
    shouldClaimActiveDevice(get().activeDeviceId, get().localPlaybackDeviceId),
  );
}

/**
 * Check if the active device is the local playback device.
 * @param activeDeviceId - The id of the active device.
 * @param localPlaybackDeviceId - The id of the local playback device.
 * @returns True if the active device is the local playback device, false otherwise.
 */
export function isLocalActiveDevice(
  activeDeviceId: string | null,
  localPlaybackDeviceId: string,
): boolean {
  return (
    activeDeviceId != null &&
    activeDeviceId !== '' &&
    Boolean(localPlaybackDeviceId) &&
    activeDeviceId === localPlaybackDeviceId
  );
}
