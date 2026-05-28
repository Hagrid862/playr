import {
  ConflictException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PlaybackState } from '@repo/contracts';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { Redis } from 'ioredis';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { playbackStateFixture, fixtureQueueItem } from '../test-utils/playback-state.fixture';
import { PLAYBACK_REDIS } from '../utils/playback-redis.constants';
import { PlaybackStatePersistenceService } from './playback-state-persistence.service';
import { ListenHistoryService } from '../../listen-history/services/listen-history.service';

/** Matches ioredis `Pipeline.exec()` result shape used by `PlaybackStatePersistenceService`. */
type ExecResult = [Error | null, unknown][] | null;
const okExecResult: ExecResult = [[null, 'OK']];

type RedisMulti = ReturnType<Redis['multi']>;

type ChainableMultiMock = {
  set: MockInstance<(key: string, value: string) => RedisMulti>;
  exec: MockInstance<() => Promise<ExecResult>>;
};

type DelMultiMock = {
  del: MockInstance<() => RedisMulti>;
  exec: MockInstance<() => Promise<ExecResult>>;
};

function asRedisMulti(mock: ChainableMultiMock): RedisMulti {
  mock.set.mockReturnValue(mock as unknown as RedisMulti);
  return mock as unknown as RedisMulti;
}

function asDelRedisMulti(mock: DelMultiMock): RedisMulti {
  mock.del.mockReturnValue(mock as unknown as RedisMulti);
  return mock as unknown as RedisMulti;
}

describe('PlaybackStatePersistenceService', () => {
  let service: PlaybackStatePersistenceService;
  let redisMock: DeepMocked<Redis>;
  let connMock: DeepMocked<Redis>;
  let listenHistoryServiceMock: DeepMocked<ListenHistoryService>;

  const userId = 'user-1';
  const initialState: Partial<PlaybackState> & Pick<PlaybackState, 'trackData'> = {
    trackData: {
      id: 'track-1',
      trackId: 'track-1',
      title: 'Song',
      artists: ['Artist'],
      albumName: 'Album',
      albumId: 'album-1',
      albumArt: 'art.jpg',
      duration: 300,
      explicit: false,
    },
    queue: [],
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    redisMock = createMock<Redis>();
    connMock = createMock<Redis>();

    redisMock.duplicate.mockResolvedValue(connMock);

    listenHistoryServiceMock = createMock<ListenHistoryService>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlaybackStatePersistenceService,
        {
          provide: PLAYBACK_REDIS,
          useValue: redisMock,
        },
        {
          provide: ListenHistoryService,
          useValue: listenHistoryServiceMock,
        },
      ],
    }).compile();

    service = module.get<PlaybackStatePersistenceService>(PlaybackStatePersistenceService);
  });

  afterEach(async () => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('createIfAbsent', () => {
    it('should successfully create state if absent', async () => {
      connMock.get.mockResolvedValueOnce(null);
      const multiMock: ChainableMultiMock = {
        set: vi.fn(),
        exec: vi.fn().mockResolvedValue(okExecResult),
      };
      connMock.multi.mockReturnValue(asRedisMulti(multiMock));

      const result = await service.createIfAbsent(userId, initialState);

      expect(result.userId).toBe(userId);
      expect(result.version).toBe(1);
      expect(connMock.watch).toHaveBeenCalled();
      expect(multiMock.set).toHaveBeenCalled();
      expect(connMock.quit).toHaveBeenCalled();
    });

    it('should throw ConflictException if state already exists', async () => {
      connMock.get.mockResolvedValueOnce(JSON.stringify({ version: 1 }));

      await expect(service.createIfAbsent(userId, initialState)).rejects.toThrow(ConflictException);

      expect(connMock.unwatch).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if watch fails', async () => {
      connMock.watch.mockRejectedValueOnce(new Error('Redis down'));

      await expect(service.createIfAbsent(userId, initialState)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should retry if exec returns null (concurrent update)', async () => {
      connMock.get.mockResolvedValue(null);
      const multiMock: ChainableMultiMock = {
        set: vi.fn(),
        exec: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(okExecResult),
      };
      connMock.multi.mockReturnValue(asRedisMulti(multiMock));

      const promise = service.createIfAbsent(userId, initialState);

      await vi.runAllTimersAsync();

      const result = await promise;
      expect(result.version).toBe(1);
      expect(connMock.multi).toHaveBeenCalledTimes(2);
    });

    it('should throw ServiceUnavailableException after max retries', async () => {
      connMock.get.mockResolvedValue(null);
      const multiMock: ChainableMultiMock = {
        set: vi.fn(),
        exec: vi.fn().mockResolvedValue(null),
      };
      connMock.multi.mockReturnValue(asRedisMulti(multiMock));

      let caughtError: unknown;
      const promise = service.createIfAbsent(userId, initialState).catch((err: unknown) => {
        caughtError = err;
      });

      for (let i = 0; i < 8; i++) {
        await vi.advanceTimersByTimeAsync(2000);
      }

      await promise;
      expect(caughtError).toBeInstanceOf(ServiceUnavailableException);
    });

    it('should throw InternalServerErrorException if multi/exec fails', async () => {
      connMock.get.mockResolvedValueOnce(null);
      connMock.multi.mockImplementation(() => {
        throw new Error('Multi failed');
      });

      await expect(service.createIfAbsent(userId, initialState)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(connMock.unwatch).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if GET fails', async () => {
      connMock.get.mockRejectedValueOnce(new Error('GET failed'));

      await expect(service.createIfAbsent(userId, initialState)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should log and retry if a command fails in transaction', async () => {
      connMock.get.mockResolvedValue(null);
      const errorExecResult: ExecResult = [[new Error('SET failed'), null]];
      const multiMock: ChainableMultiMock = {
        set: vi.fn(),
        exec: vi.fn().mockResolvedValueOnce(errorExecResult).mockResolvedValueOnce(okExecResult),
      };
      connMock.multi.mockReturnValue(asRedisMulti(multiMock));

      const promise = service.createIfAbsent(userId, initialState);

      await vi.runAllTimersAsync();

      const result = await promise;
      expect(result.version).toBe(1);
      expect(connMock.multi).toHaveBeenCalledTimes(2);
      expect(connMock.unwatch).toHaveBeenCalled();
    });

    it('records listen history when creating state that starts playing', async () => {
      connMock.get.mockResolvedValueOnce(null);
      const multiMock: ChainableMultiMock = {
        set: vi.fn(),
        exec: vi.fn().mockResolvedValue(okExecResult),
      };
      connMock.multi.mockReturnValue(asRedisMulti(multiMock));
      listenHistoryServiceMock.recordListen.mockResolvedValueOnce(undefined);

      const result = await service.createIfAbsent(userId, {
        ...initialState,
        isPlaying: true,
      });

      expect(result.isPlaying).toBe(true);
      expect(listenHistoryServiceMock.recordListen).toHaveBeenCalledWith(userId, 'track-1', true);
    });

    it('logs when listen history recording fails during createIfAbsent', async () => {
      const recordError = new Error('history write failed');
      const loggerSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      listenHistoryServiceMock.recordListen.mockRejectedValueOnce(recordError);

      connMock.get.mockResolvedValueOnce(null);
      const multiMock: ChainableMultiMock = {
        set: vi.fn(),
        exec: vi.fn().mockResolvedValue(okExecResult),
      };
      connMock.multi.mockReturnValue(asRedisMulti(multiMock));

      await service.createIfAbsent(userId, {
        ...initialState,
        isPlaying: true,
      });

      await vi.waitFor(() => {
        expect(loggerSpy).toHaveBeenCalledWith(
          'Failed to record listen history: history write failed',
          recordError.stack,
        );
      });

      loggerSpy.mockRestore();
    });
  });

  describe('applyMutation', () => {
    const existingState: PlaybackState = playbackStateFixture({
      userId,
      activeDeviceId: 'device-1',
      trackData: initialState.trackData,
      queue: [],
      version: 1,
      updatedAt: new Date().toISOString(),
      isPlaying: false,
      currentTime: 0,
      volume: 0.8,
    });

    it('should successfully apply mutation', async () => {
      connMock.get.mockResolvedValueOnce(JSON.stringify(existingState));
      const multiMock: ChainableMultiMock = {
        set: vi.fn(),
        exec: vi.fn().mockResolvedValue(okExecResult),
      };
      connMock.multi.mockReturnValue(asRedisMulti(multiMock));

      const result = await service.applyMutation(userId, 1, (curr) => ({
        ...curr,
        isPlaying: true,
      }));

      expect(result.isPlaying).toBe(true);
      expect(result.version).toBe(2);
    });

    it('should throw NotFoundException if state missing', async () => {
      connMock.get.mockResolvedValueOnce(null);

      await expect(service.applyMutation(userId, 1, (c) => c)).rejects.toThrow(NotFoundException);
      expect(connMock.unwatch).toHaveBeenCalled();
    });

    it('should throw ConflictException on version mismatch', async () => {
      connMock.get.mockResolvedValueOnce(JSON.stringify({ ...existingState, version: 2 }));

      await expect(service.applyMutation(userId, 1, (c) => c)).rejects.toThrow(ConflictException);
      expect(connMock.unwatch).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException on parse failure', async () => {
      connMock.get.mockResolvedValueOnce('invalid');

      await expect(service.applyMutation(userId, 1, (c) => c)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(connMock.unwatch).toHaveBeenCalled();
    });

    it('should propagate error from merge callback', async () => {
      connMock.get.mockResolvedValueOnce(JSON.stringify(existingState));

      await expect(
        service.applyMutation(userId, 1, () => {
          throw new Error('Callback failed');
        }),
      ).rejects.toThrow('Callback failed');
      expect(connMock.unwatch).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if watch fails', async () => {
      connMock.watch.mockRejectedValueOnce(new Error('Fail'));

      await expect(service.applyMutation(userId, 1, (c) => c)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should throw InternalServerErrorException if multi/exec fails', async () => {
      connMock.get.mockResolvedValueOnce(JSON.stringify(existingState));
      connMock.multi.mockImplementation(() => {
        throw new Error('Fail');
      });

      await expect(service.applyMutation(userId, 1, (c) => c)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(connMock.unwatch).toHaveBeenCalled();
    });

    it('should retry if exec returns null (concurrent update)', async () => {
      connMock.get.mockResolvedValue(JSON.stringify(existingState));
      const multiMock: ChainableMultiMock = {
        set: vi.fn(),
        exec: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(okExecResult),
      };
      connMock.multi.mockReturnValue(asRedisMulti(multiMock));

      const promise = service.applyMutation(userId, 1, (curr) => ({ ...curr, isPlaying: true }));

      await vi.runAllTimersAsync();

      const result = await promise;
      expect(result.isPlaying).toBe(true);
      expect(result.version).toBe(2);
      expect(connMock.multi).toHaveBeenCalledTimes(2);
    });

    it('should throw ServiceUnavailableException after max retries', async () => {
      connMock.get.mockResolvedValue(JSON.stringify(existingState));
      const multiMock: ChainableMultiMock = {
        set: vi.fn(),
        exec: vi.fn().mockResolvedValue(null),
      };
      connMock.multi.mockReturnValue(asRedisMulti(multiMock));

      let caughtError: unknown;
      const promise = service
        .applyMutation(userId, 1, (curr) => curr)
        .catch((err: unknown) => {
          caughtError = err;
        });

      for (let i = 0; i < 8; i++) {
        await vi.advanceTimersByTimeAsync(2000);
      }

      await promise;
      expect(caughtError).toBeInstanceOf(ServiceUnavailableException);
    });

    it('should throw InternalServerErrorException if GET fails', async () => {
      connMock.get.mockRejectedValueOnce(new Error('GET failed'));

      await expect(service.applyMutation(userId, 1, (c) => c)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should log and retry if a command fails in transaction', async () => {
      connMock.get.mockResolvedValue(JSON.stringify(existingState));
      const errorExecResult: ExecResult = [[new Error('SET failed'), null]];
      const multiMock: ChainableMultiMock = {
        set: vi.fn(),
        exec: vi.fn().mockResolvedValueOnce(errorExecResult).mockResolvedValueOnce(okExecResult),
      };
      connMock.multi.mockReturnValue(asRedisMulti(multiMock));

      const promise = service.applyMutation(userId, 1, (curr) => ({ ...curr, isPlaying: true }));

      await vi.runAllTimersAsync();

      const result = await promise;
      expect(result.isPlaying).toBe(true);
      expect(result.version).toBe(2);
      expect(connMock.multi).toHaveBeenCalledTimes(2);
      expect(connMock.unwatch).toHaveBeenCalled();
    });

    describe('listen history recording and deduplication', () => {
      it('should not record a new listen when resuming the same track with no timing drift', async () => {
        const pausedState = playbackStateFixture({
          userId,
          isPlaying: false,
          currentTime: 35,
          trackData: initialState.trackData,
          version: 1,
        });

        connMock.get.mockResolvedValueOnce(JSON.stringify(pausedState));
        const multiMock: ChainableMultiMock = {
          set: vi.fn(),
          exec: vi.fn().mockResolvedValue(okExecResult),
        };
        connMock.multi.mockReturnValue(asRedisMulti(multiMock));

        await service.applyMutation(userId, 1, (curr) => ({
          ...curr,
          isPlaying: true,
        }));

        expect(listenHistoryServiceMock.recordListen).not.toHaveBeenCalled();
      });

      it('should not record a new listen when resuming the same track with slight drift (e.g. 2s)', async () => {
        const pausedState = playbackStateFixture({
          userId,
          isPlaying: false,
          currentTime: 35,
          trackData: initialState.trackData,
          version: 1,
        });

        connMock.get.mockResolvedValueOnce(JSON.stringify(pausedState));
        const multiMock: ChainableMultiMock = {
          set: vi.fn(),
          exec: vi.fn().mockResolvedValue(okExecResult),
        };
        connMock.multi.mockReturnValue(asRedisMulti(multiMock));

        await service.applyMutation(userId, 1, (curr) => ({
          ...curr,
          isPlaying: true,
          currentTime: 37,
        }));

        expect(listenHistoryServiceMock.recordListen).not.toHaveBeenCalled();
      });

      it('should record a new listen when resuming with large timing difference (e.g. >5s)', async () => {
        const pausedState = playbackStateFixture({
          userId,
          isPlaying: false,
          currentTime: 35,
          trackData: initialState.trackData,
          version: 1,
        });

        connMock.get.mockResolvedValueOnce(JSON.stringify(pausedState));
        const multiMock: ChainableMultiMock = {
          set: vi.fn(),
          exec: vi.fn().mockResolvedValue(okExecResult),
        };
        connMock.multi.mockReturnValue(asRedisMulti(multiMock));

        listenHistoryServiceMock.recordListen.mockResolvedValueOnce(undefined);

        await service.applyMutation(userId, 1, (curr) => ({
          ...curr,
          isPlaying: true,
          currentTime: 42,
        }));

        expect(listenHistoryServiceMock.recordListen).toHaveBeenCalledWith(userId, 'track-1', true);
      });

      it('should record a new listen when track repeats (currentTime resets to <= 5)', async () => {
        const playingState = playbackStateFixture({
          userId,
          isPlaying: true,
          currentTime: 180,
          trackData: initialState.trackData,
          version: 1,
        });

        connMock.get.mockResolvedValueOnce(JSON.stringify(playingState));
        const multiMock: ChainableMultiMock = {
          set: vi.fn(),
          exec: vi.fn().mockResolvedValue(okExecResult),
        };
        connMock.multi.mockReturnValue(asRedisMulti(multiMock));

        listenHistoryServiceMock.recordListen.mockResolvedValueOnce(undefined);

        await service.applyMutation(userId, 1, (curr) => ({
          ...curr,
          currentTime: 0,
        }));

        expect(listenHistoryServiceMock.recordListen).toHaveBeenCalledWith(userId, 'track-1', true);
      });

      it('should record a new listen when resuming in the first 5 seconds of the song', async () => {
        const pausedState = playbackStateFixture({
          userId,
          isPlaying: false,
          currentTime: 2,
          trackData: initialState.trackData,
          version: 1,
        });

        connMock.get.mockResolvedValueOnce(JSON.stringify(pausedState));
        const multiMock: ChainableMultiMock = {
          set: vi.fn(),
          exec: vi.fn().mockResolvedValue(okExecResult),
        };
        connMock.multi.mockReturnValue(asRedisMulti(multiMock));

        listenHistoryServiceMock.recordListen.mockResolvedValueOnce(undefined);

        await service.applyMutation(userId, 1, (curr) => ({
          ...curr,
          isPlaying: true,
        }));

        expect(listenHistoryServiceMock.recordListen).toHaveBeenCalledWith(userId, 'track-1', true);
      });

      it('should not record a new listen when seeking during active playback', async () => {
        const playingState = playbackStateFixture({
          userId,
          isPlaying: true,
          currentTime: 35,
          trackData: initialState.trackData,
          version: 1,
        });

        connMock.get.mockResolvedValueOnce(JSON.stringify(playingState));
        const multiMock: ChainableMultiMock = {
          set: vi.fn(),
          exec: vi.fn().mockResolvedValue(okExecResult),
        };
        connMock.multi.mockReturnValue(asRedisMulti(multiMock));

        await service.applyMutation(userId, 1, (curr) => ({
          ...curr,
          currentTime: 120,
        }));

        expect(listenHistoryServiceMock.recordListen).not.toHaveBeenCalled();
      });

      it('should not record a new listen when seeking while paused', async () => {
        const pausedState = playbackStateFixture({
          userId,
          isPlaying: false,
          currentTime: 35,
          trackData: initialState.trackData,
          version: 1,
        });

        connMock.get.mockResolvedValueOnce(JSON.stringify(pausedState));
        const multiMock: ChainableMultiMock = {
          set: vi.fn(),
          exec: vi.fn().mockResolvedValue(okExecResult),
        };
        connMock.multi.mockReturnValue(asRedisMulti(multiMock));

        await service.applyMutation(userId, 1, (curr) => ({
          ...curr,
          currentTime: 120,
        }));

        expect(listenHistoryServiceMock.recordListen).not.toHaveBeenCalled();
      });

      it('should record a new listen when the track changes while playing', async () => {
        const playingState = playbackStateFixture({
          userId,
          isPlaying: true,
          currentTime: 35,
          trackData: initialState.trackData,
          version: 1,
        });

        connMock.get.mockResolvedValueOnce(JSON.stringify(playingState));
        const multiMock: ChainableMultiMock = {
          set: vi.fn(),
          exec: vi.fn().mockResolvedValue(okExecResult),
        };
        connMock.multi.mockReturnValue(asRedisMulti(multiMock));

        listenHistoryServiceMock.recordListen.mockResolvedValueOnce(undefined);

        const newTrackData = {
          id: 'track-2',
          trackId: 'track-2',
          title: 'Other Song',
          artists: ['Other Artist'],
          albumName: 'Other Album',
          albumId: 'album-2',
          albumArt: null,
          duration: 240,
          explicit: false,
        };

        await service.applyMutation(userId, 1, (curr) => ({
          ...curr,
          trackData: newTrackData,
          currentTime: 0,
        }));

        expect(listenHistoryServiceMock.recordListen).toHaveBeenCalledWith(userId, 'track-2', true);
      });

      it('logs when listen history recording fails after mutation', async () => {
        const recordError = new Error('history write failed');
        const loggerSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

        const playingState = playbackStateFixture({
          userId,
          isPlaying: true,
          currentTime: 35,
          trackData: initialState.trackData,
          version: 1,
        });

        connMock.get.mockResolvedValueOnce(JSON.stringify(playingState));
        const multiMock: ChainableMultiMock = {
          set: vi.fn(),
          exec: vi.fn().mockResolvedValue(okExecResult),
        };
        connMock.multi.mockReturnValue(asRedisMulti(multiMock));

        listenHistoryServiceMock.recordListen.mockRejectedValueOnce(recordError);

        const newTrackData = {
          id: 'track-2',
          trackId: 'track-2',
          title: 'Other Song',
          artists: ['Other Artist'],
          albumName: 'Other Album',
          albumId: 'album-2',
          albumArt: null,
          duration: 240,
          explicit: false,
        };

        await service.applyMutation(userId, 1, (curr) => ({
          ...curr,
          trackData: newTrackData,
          currentTime: 0,
        }));

        await vi.waitFor(() => {
          expect(loggerSpy).toHaveBeenCalledWith(
            'Failed to record listen history: history write failed',
            recordError.stack,
          );
        });

        loggerSpy.mockRestore();
      });
    });
  });

  describe('pauseAndClearActiveIfDeviceMatches', () => {
    it('returns null when no playback state exists', async () => {
      connMock.get.mockResolvedValueOnce(null);
      const result = await service.pauseAndClearActiveIfDeviceMatches(userId, 'device-1');
      expect(result).toBeNull();
    });

    it('returns null when disconnected device is not the active device', async () => {
      const st = playbackStateFixture({
        userId,
        activeDeviceId: 'other-device',
        isPlaying: true,
        version: 2,
      });
      connMock.get.mockResolvedValueOnce(JSON.stringify(st));

      const result = await service.pauseAndClearActiveIfDeviceMatches(userId, 'device-1');
      expect(result).toBeNull();
    });

    it('clears active device and pauses when disconnected device matches', async () => {
      const st = playbackStateFixture({
        userId,
        activeDeviceId: 'device-1',
        isPlaying: true,
        version: 3,
      });
      connMock.get.mockResolvedValueOnce(JSON.stringify(st));
      const multiMock: ChainableMultiMock = {
        set: vi.fn(),
        exec: vi.fn().mockResolvedValue(okExecResult),
      };
      connMock.multi.mockReturnValue(asRedisMulti(multiMock));

      const result = await service.pauseAndClearActiveIfDeviceMatches(userId, 'device-1');

      expect(result?.activeDeviceId).toBeNull();
      expect(result?.isPlaying).toBe(false);
      expect(result?.version).toBe(4);
    });

    it('should throw InternalServerErrorException if WATCH fails', async () => {
      connMock.watch.mockRejectedValueOnce(new Error('WATCH failed'));

      await expect(service.pauseAndClearActiveIfDeviceMatches(userId, 'device-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should throw InternalServerErrorException if GET fails', async () => {
      connMock.get.mockRejectedValueOnce(new Error('GET failed'));

      await expect(service.pauseAndClearActiveIfDeviceMatches(userId, 'device-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should throw InternalServerErrorException if parse fails', async () => {
      connMock.get.mockResolvedValueOnce('invalid-json');

      await expect(service.pauseAndClearActiveIfDeviceMatches(userId, 'device-1')).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(connMock.unwatch).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if multi/exec fails', async () => {
      const st = playbackStateFixture({ userId, activeDeviceId: 'device-1' });
      connMock.get.mockResolvedValueOnce(JSON.stringify(st));
      connMock.multi.mockImplementation(() => {
        throw new Error('Multi failed');
      });

      await expect(service.pauseAndClearActiveIfDeviceMatches(userId, 'device-1')).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(connMock.unwatch).toHaveBeenCalled();
    });

    it('should log and retry if a command fails in transaction', async () => {
      const st = playbackStateFixture({ userId, activeDeviceId: 'device-1' });
      connMock.get.mockResolvedValue(JSON.stringify(st));
      const errorExecResult: ExecResult = [[new Error('SET failed'), null]];
      const multiMock: ChainableMultiMock = {
        set: vi.fn(),
        exec: vi.fn().mockResolvedValueOnce(errorExecResult).mockResolvedValueOnce(okExecResult),
      };
      connMock.multi.mockReturnValue(asRedisMulti(multiMock));

      const promise = service.pauseAndClearActiveIfDeviceMatches(userId, 'device-1');

      await vi.runAllTimersAsync();

      const result = await promise;
      expect(result?.version).toBe(st.version + 1);
      expect(connMock.multi).toHaveBeenCalledTimes(2);
      expect(connMock.unwatch).toHaveBeenCalled();
    });

    it('should throw ServiceUnavailableException after max retries', async () => {
      const st = playbackStateFixture({ userId, activeDeviceId: 'device-1' });
      connMock.get.mockResolvedValue(JSON.stringify(st));
      const multiMock: ChainableMultiMock = {
        set: vi.fn(),
        exec: vi.fn().mockResolvedValue(null),
      };
      connMock.multi.mockReturnValue(asRedisMulti(multiMock));

      let caughtError: unknown;
      const promise = service
        .pauseAndClearActiveIfDeviceMatches(userId, 'device-1')
        .catch((err: unknown) => {
          caughtError = err;
        });

      for (let i = 0; i < 8; i++) {
        await vi.advanceTimersByTimeAsync(2000);
      }

      await promise;
      expect(caughtError).toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe('purgeDeletedLibraryTrack', () => {
    it('returns unchanged when key missing', async () => {
      connMock.get.mockResolvedValueOnce(null);
      const r = await service.purgeDeletedLibraryTrack(userId, 'track-x');
      expect(r).toEqual({ kind: 'unchanged' });
    });

    it('returns unchanged when deleted id is not referenced', async () => {
      const st = playbackStateFixture({ userId, queue: [], version: 2 });
      connMock.get.mockResolvedValueOnce(JSON.stringify(st));
      const r = await service.purgeDeletedLibraryTrack(userId, 'other-track');
      expect(r).toEqual({ kind: 'unchanged' });
      expect(connMock.unwatch).toHaveBeenCalled();
    });

    it('deletes key when current track matches and queue is empty after filter', async () => {
      const st = playbackStateFixture({
        userId,
        queue: [],
        version: 2,
        trackData: {
          id: 'gone',
          trackId: 'gone',
          title: 'X',
          artists: ['A'],
          albumName: 'Al',
          albumId: 'alb',
          albumArt: null,
          duration: 60,
          explicit: false,
        },
      });
      connMock.get.mockResolvedValueOnce(JSON.stringify(st));
      connMock.multi.mockReturnValue({
        del: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(okExecResult),
      } as unknown as RedisMulti);

      const r = await service.purgeDeletedLibraryTrack(userId, 'gone');
      expect(r).toEqual({ kind: 'removed' });
    });

    it('promotes next queue track when current matches', async () => {
      const nextTrack = {
        id: 'next',
        trackId: 'next',
        title: 'Next',
        artists: ['A'],
        albumName: 'Al',
        albumId: 'alb',
        albumArt: null,
        duration: 90,
        explicit: false,
      };
      const st = playbackStateFixture({
        userId,
        version: 3,
        trackData: {
          id: 'gone',
          trackId: 'gone',
          title: 'X',
          artists: ['A'],
          albumName: 'Al',
          albumId: 'alb',
          albumArt: null,
          duration: 60,
          explicit: false,
        },
        queue: [fixtureQueueItem({ track: nextTrack })],
      });
      connMock.get.mockResolvedValueOnce(JSON.stringify(st));
      const multiMock: ChainableMultiMock = {
        set: vi.fn(),
        exec: vi.fn().mockResolvedValue(okExecResult),
      };
      connMock.multi.mockReturnValue(asRedisMulti(multiMock));

      const r = await service.purgeDeletedLibraryTrack(userId, 'gone');
      expect(r.kind).toBe('updated');
      if (r.kind === 'updated') {
        expect(r.state.trackData.id).toBe('next');
        expect(r.state.queue).toHaveLength(0);
        expect(r.state.isPlaying).toBe(false);
        expect(r.state.currentTime).toBe(0);
      }
    });

    it('throws InternalServerErrorException if WATCH fails', async () => {
      connMock.watch.mockRejectedValueOnce(new Error('WATCH failed'));

      await expect(service.purgeDeletedLibraryTrack(userId, 'track-x')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('throws InternalServerErrorException if GET fails', async () => {
      connMock.get.mockRejectedValueOnce(new Error('GET failed'));

      await expect(service.purgeDeletedLibraryTrack(userId, 'track-x')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('throws InternalServerErrorException if parse fails', async () => {
      connMock.get.mockResolvedValueOnce('not-json');

      await expect(service.purgeDeletedLibraryTrack(userId, 'track-x')).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(connMock.unwatch).toHaveBeenCalled();
    });

    it('updates when deleted id matches queue item via trackId only', async () => {
      const queued = {
        id: 'internal-id',
        trackId: 'catalog-id',
        title: 'Q',
        artists: ['A'],
        albumName: 'Al',
        albumId: 'alb',
        albumArt: null,
        duration: 60,
        explicit: false,
      };
      const st = playbackStateFixture({
        userId,
        version: 2,
        queue: [fixtureQueueItem({ track: queued })],
      });
      connMock.get.mockResolvedValueOnce(JSON.stringify(st));
      const multiMock: ChainableMultiMock = {
        set: vi.fn(),
        exec: vi.fn().mockResolvedValue(okExecResult),
      };
      connMock.multi.mockReturnValue(asRedisMulti(multiMock));

      const r = await service.purgeDeletedLibraryTrack(userId, 'catalog-id');
      expect(r.kind).toBe('updated');
      if (r.kind === 'updated') {
        expect(r.state.queue).toHaveLength(0);
      }
    });

    it('updates when deleted track appears only in history', async () => {
      const histTrack = {
        id: 'gone',
        trackId: 'gone',
        title: 'H',
        artists: ['A'],
        albumName: 'Al',
        albumId: 'alb',
        albumArt: null,
        duration: 60,
        explicit: false,
      };
      const st = playbackStateFixture({
        userId,
        version: 4,
        history: [fixtureQueueItem({ track: histTrack, position: 0 })],
      });
      connMock.get.mockResolvedValueOnce(JSON.stringify(st));
      const multiMock: ChainableMultiMock = {
        set: vi.fn(),
        exec: vi.fn().mockResolvedValue(okExecResult),
      };
      connMock.multi.mockReturnValue(asRedisMulti(multiMock));

      const r = await service.purgeDeletedLibraryTrack(userId, 'gone');
      expect(r.kind).toBe('updated');
      if (r.kind === 'updated') {
        expect(r.state.history).toHaveLength(0);
      }
    });

    it('reindexes history positions when a deleted entry is removed but others remain', async () => {
      const goneHist = {
        id: 'gone',
        trackId: 'gone',
        title: 'H1',
        artists: ['A'],
        albumName: 'Al',
        albumId: 'alb',
        albumArt: null,
        duration: 60,
        explicit: false,
      };
      const keepHist = {
        id: 'keep-h',
        trackId: 'keep-h',
        title: 'H2',
        artists: ['A'],
        albumName: 'Al',
        albumId: 'alb',
        albumArt: null,
        duration: 61,
        explicit: false,
      };
      const st = playbackStateFixture({
        userId,
        version: 5,
        history: [
          fixtureQueueItem({ track: goneHist, position: 0 }),
          fixtureQueueItem({ track: keepHist, position: 1 }),
        ],
      });
      connMock.get.mockResolvedValueOnce(JSON.stringify(st));
      const multiMock: ChainableMultiMock = {
        set: vi.fn(),
        exec: vi.fn().mockResolvedValue(okExecResult),
      };
      connMock.multi.mockReturnValue(asRedisMulti(multiMock));

      const r = await service.purgeDeletedLibraryTrack(userId, 'gone');
      expect(r.kind).toBe('updated');
      if (r.kind === 'updated') {
        expect(r.state.history).toHaveLength(1);
        expect(r.state.history[0]?.position).toBe(0);
        expect(r.state.history[0]?.track.id).toBe('keep-h');
      }
    });

    it('reindexes tail queue after promoting when multiple queued tracks remain', async () => {
      const nextTrack = {
        id: 'next',
        trackId: 'next',
        title: 'Next',
        artists: ['A'],
        albumName: 'Al',
        albumId: 'alb',
        albumArt: null,
        duration: 90,
        explicit: false,
      };
      const tailTrack = {
        id: 'tail',
        trackId: 'tail',
        title: 'Tail',
        artists: ['A'],
        albumName: 'Al',
        albumId: 'alb',
        albumArt: null,
        duration: 91,
        explicit: false,
      };
      const st = playbackStateFixture({
        userId,
        version: 3,
        trackData: {
          id: 'gone',
          trackId: 'gone',
          title: 'X',
          artists: ['A'],
          albumName: 'Al',
          albumId: 'alb',
          albumArt: null,
          duration: 60,
          explicit: false,
        },
        queue: [
          fixtureQueueItem({ track: nextTrack, position: 0 }),
          fixtureQueueItem({ track: tailTrack, position: 1 }),
        ],
      });
      connMock.get.mockResolvedValueOnce(JSON.stringify(st));
      const multiMock: ChainableMultiMock = {
        set: vi.fn(),
        exec: vi.fn().mockResolvedValue(okExecResult),
      };
      connMock.multi.mockReturnValue(asRedisMulti(multiMock));

      const r = await service.purgeDeletedLibraryTrack(userId, 'gone');
      expect(r.kind).toBe('updated');
      if (r.kind === 'updated') {
        expect(r.state.trackData.id).toBe('next');
        expect(r.state.queue).toHaveLength(1);
        expect(r.state.queue[0]?.track.id).toBe('tail');
        expect(r.state.queue[0]?.position).toBe(0);
      }
    });

    it('throws InternalServerErrorException if DEL multi/exec throws', async () => {
      const st = playbackStateFixture({
        userId,
        queue: [],
        version: 2,
        trackData: {
          id: 'gone',
          trackId: 'gone',
          title: 'X',
          artists: ['A'],
          albumName: 'Al',
          albumId: 'alb',
          albumArt: null,
          duration: 60,
          explicit: false,
        },
      });
      connMock.get.mockResolvedValueOnce(JSON.stringify(st));
      connMock.multi.mockImplementation(() => {
        throw new Error('Multi failed');
      });

      await expect(service.purgeDeletedLibraryTrack(userId, 'gone')).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(connMock.unwatch).toHaveBeenCalled();
    });

    it('retries DEL transaction when exec returns null then succeeds', async () => {
      const st = playbackStateFixture({
        userId,
        queue: [],
        version: 2,
        trackData: {
          id: 'gone',
          trackId: 'gone',
          title: 'X',
          artists: ['A'],
          albumName: 'Al',
          albumId: 'alb',
          albumArt: null,
          duration: 60,
          explicit: false,
        },
      });
      connMock.get.mockResolvedValue(JSON.stringify(st));
      const delMulti: DelMultiMock = {
        del: vi.fn(),
        exec: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(okExecResult),
      };
      connMock.multi.mockReturnValue(asDelRedisMulti(delMulti));

      const promise = service.purgeDeletedLibraryTrack(userId, 'gone');
      await vi.runAllTimersAsync();
      const r = await promise;

      expect(r).toEqual({ kind: 'removed' });
      expect(delMulti.exec).toHaveBeenCalledTimes(2);
    });

    it('retries DEL transaction when a command errors then succeeds', async () => {
      const st = playbackStateFixture({
        userId,
        queue: [],
        version: 2,
        trackData: {
          id: 'gone',
          trackId: 'gone',
          title: 'X',
          artists: ['A'],
          albumName: 'Al',
          albumId: 'alb',
          albumArt: null,
          duration: 60,
          explicit: false,
        },
      });
      connMock.get.mockResolvedValue(JSON.stringify(st));
      const errorExec: ExecResult = [[new Error('DEL failed'), null]];
      const delMulti: DelMultiMock = {
        del: vi.fn(),
        exec: vi.fn().mockResolvedValueOnce(errorExec).mockResolvedValueOnce(okExecResult),
      };
      connMock.multi.mockReturnValue(asDelRedisMulti(delMulti));

      const promise = service.purgeDeletedLibraryTrack(userId, 'gone');
      await vi.runAllTimersAsync();
      const r = await promise;

      expect(r).toEqual({ kind: 'removed' });
      expect(connMock.unwatch).toHaveBeenCalled();
    });

    it('throws InternalServerErrorException if SET multi/exec throws', async () => {
      const keep = {
        id: 'keep',
        trackId: 'keep',
        title: 'K',
        artists: ['A'],
        albumName: 'Al',
        albumId: 'alb',
        albumArt: null,
        duration: 60,
        explicit: false,
      };
      const st = playbackStateFixture({
        userId,
        version: 2,
        trackData: keep,
        queue: [
          fixtureQueueItem({
            track: {
              id: 'gone',
              trackId: 'gone',
              title: 'X',
              artists: ['A'],
              albumName: 'Al',
              albumId: 'alb',
              albumArt: null,
              duration: 60,
              explicit: false,
            },
          }),
        ],
      });
      connMock.get.mockResolvedValueOnce(JSON.stringify(st));
      connMock.multi.mockImplementation(() => {
        throw new Error('Multi failed');
      });

      await expect(service.purgeDeletedLibraryTrack(userId, 'gone')).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(connMock.unwatch).toHaveBeenCalled();
    });

    it('retries SET transaction when exec returns null then succeeds', async () => {
      const keep = {
        id: 'keep',
        trackId: 'keep',
        title: 'K',
        artists: ['A'],
        albumName: 'Al',
        albumId: 'alb',
        albumArt: null,
        duration: 60,
        explicit: false,
      };
      const st = playbackStateFixture({
        userId,
        version: 2,
        trackData: keep,
        queue: [
          fixtureQueueItem({
            track: {
              id: 'gone',
              trackId: 'gone',
              title: 'X',
              artists: ['A'],
              albumName: 'Al',
              albumId: 'alb',
              albumArt: null,
              duration: 60,
              explicit: false,
            },
          }),
        ],
      });
      connMock.get.mockResolvedValue(JSON.stringify(st));
      const multiMock: ChainableMultiMock = {
        set: vi.fn(),
        exec: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(okExecResult),
      };
      connMock.multi.mockReturnValue(asRedisMulti(multiMock));

      const promise = service.purgeDeletedLibraryTrack(userId, 'gone');
      await vi.runAllTimersAsync();
      const r = await promise;

      expect(r.kind).toBe('updated');
      if (r.kind === 'updated') {
        expect(r.state.queue).toHaveLength(0);
      }
      expect(multiMock.exec).toHaveBeenCalledTimes(2);
    });

    it('retries SET transaction when a command errors then succeeds', async () => {
      const keep = {
        id: 'keep',
        trackId: 'keep',
        title: 'K',
        artists: ['A'],
        albumName: 'Al',
        albumId: 'alb',
        albumArt: null,
        duration: 60,
        explicit: false,
      };
      const st = playbackStateFixture({
        userId,
        version: 2,
        trackData: keep,
        queue: [
          fixtureQueueItem({
            track: {
              id: 'gone',
              trackId: 'gone',
              title: 'X',
              artists: ['A'],
              albumName: 'Al',
              albumId: 'alb',
              albumArt: null,
              duration: 60,
              explicit: false,
            },
          }),
        ],
      });
      connMock.get.mockResolvedValue(JSON.stringify(st));
      const errorExec: ExecResult = [[new Error('SET failed'), null]];
      const multiMock: ChainableMultiMock = {
        set: vi.fn(),
        exec: vi.fn().mockResolvedValueOnce(errorExec).mockResolvedValueOnce(okExecResult),
      };
      connMock.multi.mockReturnValue(asRedisMulti(multiMock));

      const promise = service.purgeDeletedLibraryTrack(userId, 'gone');
      await vi.runAllTimersAsync();
      const r = await promise;

      expect(r.kind).toBe('updated');
      expect(connMock.unwatch).toHaveBeenCalled();
    });

    it('throws ServiceUnavailableException after max retries on purge', async () => {
      const keep = {
        id: 'keep',
        trackId: 'keep',
        title: 'K',
        artists: ['A'],
        albumName: 'Al',
        albumId: 'alb',
        albumArt: null,
        duration: 60,
        explicit: false,
      };
      const st = playbackStateFixture({
        userId,
        version: 2,
        trackData: keep,
        queue: [
          fixtureQueueItem({
            track: {
              id: 'gone',
              trackId: 'gone',
              title: 'X',
              artists: ['A'],
              albumName: 'Al',
              albumId: 'alb',
              albumArt: null,
              duration: 60,
              explicit: false,
            },
          }),
        ],
      });
      connMock.get.mockResolvedValue(JSON.stringify(st));
      const multiMock: ChainableMultiMock = {
        set: vi.fn(),
        exec: vi.fn().mockResolvedValue(null),
      };
      connMock.multi.mockReturnValue(asRedisMulti(multiMock));

      let caughtError: unknown;
      const promise = service.purgeDeletedLibraryTrack(userId, 'gone').catch((err: unknown) => {
        caughtError = err;
      });

      for (let i = 0; i < 8; i++) {
        await vi.advanceTimersByTimeAsync(2000);
      }

      await promise;
      expect(caughtError).toBeInstanceOf(ServiceUnavailableException);
    });
  });
});
