import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PlaybackState } from '@repo/contracts';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { Redis } from 'ioredis';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { playbackStateFixture } from '../test-utils/playback-state.fixture';
import { PLAYBACK_REDIS } from '../utils/playback-redis.constants';
import { PlaybackStatePersistenceService } from './playback-state-persistence.service';

/** Matches ioredis `Pipeline.exec()` result shape used by `PlaybackStatePersistenceService`. */
type ExecResult = [Error | null, unknown][] | null;
const okExecResult: ExecResult = [[null, 'OK']];

type RedisMulti = ReturnType<Redis['multi']>;

type ChainableMultiMock = {
  set: MockInstance<(key: string, value: string) => RedisMulti>;
  exec: MockInstance<() => Promise<ExecResult>>;
};

function asRedisMulti(mock: ChainableMultiMock): RedisMulti {
  mock.set.mockReturnValue(mock as unknown as RedisMulti);
  return mock as unknown as RedisMulti;
}

describe('PlaybackStatePersistenceService', () => {
  let service: PlaybackStatePersistenceService;
  let redisMock: DeepMocked<Redis>;
  let connMock: DeepMocked<Redis>;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlaybackStatePersistenceService,
        {
          provide: PLAYBACK_REDIS,
          useValue: redisMock,
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
});
