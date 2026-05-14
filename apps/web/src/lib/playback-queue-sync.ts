import type { PlaybackState } from '@repo/contracts';
import { applyStateFromServer, getPlaybackSocket } from './playback-sync';

/**
 * Emits a queue command and handles the response.
 * If a version conflict occurs, it triggers a full state resync.
 */
export async function emitQueueCommand<T extends { expectedVersion: number }>(
  event: string,
  data: T,
): Promise<void> {
  const socket = getPlaybackSocket();
  if (!socket?.connected) return;

  return new Promise((resolve, reject) => {
    socket.emit(event, data, (result: PlaybackState | { error: string; code?: string }) => {
      if (result && 'error' in result) {
        if (result.code === 'CONFLICT' || result.error.includes('version mismatch')) {
          // Resync on conflict
          socket.emit('query:get-state', {}, (payload: PlaybackState | null) => {
            if (payload) applyStateFromServer(payload);
          });
        }
        reject(new Error(result.error));
        return;
      }

      if (result) {
        applyStateFromServer(result as PlaybackState);
      }
      resolve();
    });
  });
}

export function isPlaybackSyncConnected(): boolean {
  return Boolean(getPlaybackSocket()?.connected);
}
