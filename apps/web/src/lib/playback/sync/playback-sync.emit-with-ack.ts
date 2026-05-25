import type { Socket } from 'socket.io-client';

export const PLAYBACK_SOCKET_ACK_TIMEOUT_MS = 5000;

export class PlaybackSocketAckTimeoutError extends Error {
  readonly code = 'TIMEOUT' as const;
  constructor(
    readonly event: string,
    readonly timeoutMs: number,
  ) {
    super(`Playback socket ack timed out for "${event}" after ${timeoutMs}ms`);
    this.name = 'PlaybackSocketAckTimeoutError';
  }
}

export class PlaybackSocketDisconnectedError extends Error {
  readonly code = 'DISCONNECTED' as const;
  constructor(readonly event: string) {
    super(`Playback socket disconnected while waiting for ack: "${event}"`);
    this.name = 'PlaybackSocketDisconnectedError';
  }
}

export class PlaybackSyncCommandFailedError extends Error {
  readonly code = 'COMMAND_FAILED' as const;
  constructor(
    readonly event: string,
    readonly reason: string,
    readonly serverCode?: string,
  ) {
    super(`Playback sync command "${event}" failed: ${reason}`);
    this.name = 'PlaybackSyncCommandFailedError';
  }
}

/**
 * Emits a Socket.IO event with an acknowledgement callback, racing against timeout and disconnect.
 * Cleans up timer and disconnect listener on any outcome; ignores a late ack after settle.
 */
export function emitWithAck<T>(
  socket: Socket,
  event: string,
  payload: object,
  timeoutMs: number = PLAYBACK_SOCKET_ACK_TIMEOUT_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const onDisconnect = () => {
      settle(() => {
        reject(new PlaybackSocketDisconnectedError(event));
      });
    };

    const cleanup = () => {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
      socket.off('disconnect', onDisconnect);
    };

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn();
    };

    timer = setTimeout(() => {
      settle(() => {
        reject(new PlaybackSocketAckTimeoutError(event, timeoutMs));
      });
    }, timeoutMs);

    socket.once('disconnect', onDisconnect);

    socket.emit(event, payload, (response: T) => {
      settle(() => {
        resolve(response);
      });
    });
  });
}
