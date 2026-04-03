import type { PlaybackState } from '@repo/contracts';
import type { Socket } from 'socket.io-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyStateFromServer, getPlaybackSocket } from '../sync/playback-sync';
import { emitQueueCommand, isPlaybackSyncConnected } from './playback-queue-sync';

type QueueEmitAck = PlaybackState | { error: string; code?: string } | null;

function asPlaybackSocket(mock: unknown): Socket {
  return mock as Socket;
}

vi.mock('../sync/playback-sync', () => ({
  getPlaybackSocket: vi.fn(),
  applyStateFromServer: vi.fn(),
}));

describe('playback/queue/playback-queue-sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('emitQueueCommand', () => {
    it('returns early if socket is not connected', async () => {
      vi.mocked(getPlaybackSocket).mockReturnValue(asPlaybackSocket({ connected: false }));
      const result = await emitQueueCommand('test', { expectedVersion: 1 });
      expect(result).toBeUndefined();
    });

    it('emits event and resolves on success', async () => {
      const socket = {
        connected: true,
        emit: vi.fn((_event: string, _data: unknown, callback: (r: QueueEmitAck) => void) => {
          callback({ version: 2 } as PlaybackState);
        }),
      };
      vi.mocked(getPlaybackSocket).mockReturnValue(asPlaybackSocket(socket));

      await emitQueueCommand('test', { expectedVersion: 1 });

      expect(socket.emit).toHaveBeenCalledWith(
        'test',
        { expectedVersion: 1 },
        expect.any(Function),
      );
      expect(applyStateFromServer).toHaveBeenCalledWith({ version: 2 });
    });

    it('rejects on error and handles conflict', async () => {
      const socket = {
        connected: true,
        emit: vi
          .fn()
          .mockImplementation(
            (event: string, _data: unknown, callback: (r: QueueEmitAck) => void) => {
              if (event === 'test') {
                callback({ error: 'version mismatch', code: 'CONFLICT' });
              } else if (event === 'query:get-state') {
                callback({ version: 5 } as PlaybackState);
              }
            },
          ),
      };
      vi.mocked(getPlaybackSocket).mockReturnValue(asPlaybackSocket(socket));

      await expect(emitQueueCommand('test', { expectedVersion: 1 })).rejects.toThrow(
        'version mismatch',
      );

      expect(socket.emit).toHaveBeenCalledWith('query:get-state', {}, expect.any(Function));
      expect(applyStateFromServer).toHaveBeenCalledWith({ version: 5 });
    });

    it('rejects on normal error without sync', async () => {
      const socket = {
        connected: true,
        emit: vi.fn((_event: string, _data: unknown, callback: (r: QueueEmitAck) => void) => {
          callback({ error: 'some error' });
        }),
      };
      vi.mocked(getPlaybackSocket).mockReturnValue(asPlaybackSocket(socket));

      await expect(emitQueueCommand('test', { expectedVersion: 1 })).rejects.toThrow('some error');

      expect(socket.emit).not.toHaveBeenCalledWith(
        'query:get-state',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('handles null payload on conflict resync', async () => {
      const socket = {
        connected: true,
        emit: vi
          .fn()
          .mockImplementation(
            (event: string, _data: unknown, callback: (r: QueueEmitAck) => void) => {
              if (event === 'test') {
                callback({ error: 'conflict', code: 'CONFLICT' });
              } else if (event === 'query:get-state') {
                callback(null);
              }
            },
          ),
      };
      vi.mocked(getPlaybackSocket).mockReturnValue(asPlaybackSocket(socket));

      await expect(emitQueueCommand('test', { expectedVersion: 1 })).rejects.toThrow('conflict');
      expect(applyStateFromServer).not.toHaveBeenCalled();
    });

    it('resolves when result is null', async () => {
      const socket = {
        connected: true,
        emit: vi.fn((_event: string, _data: unknown, callback: (r: QueueEmitAck) => void) => {
          callback(null);
        }),
      };
      vi.mocked(getPlaybackSocket).mockReturnValue(asPlaybackSocket(socket));

      await emitQueueCommand('test', { expectedVersion: 1 });
      expect(applyStateFromServer).not.toHaveBeenCalled();
    });
  });

  describe('isPlaybackSyncConnected', () => {
    it('returns true if connected', () => {
      vi.mocked(getPlaybackSocket).mockReturnValue(asPlaybackSocket({ connected: true }));
      expect(isPlaybackSyncConnected()).toBe(true);
    });

    it('returns false if not connected', () => {
      vi.mocked(getPlaybackSocket).mockReturnValue(asPlaybackSocket({ connected: false }));
      expect(isPlaybackSyncConnected()).toBe(false);
    });

    it('returns false if no socket', () => {
      vi.mocked(getPlaybackSocket).mockReturnValue(null);
      expect(isPlaybackSyncConnected()).toBe(false);
    });
  });
});
