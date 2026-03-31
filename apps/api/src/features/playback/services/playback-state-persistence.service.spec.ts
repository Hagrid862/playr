import { Test, TestingModule } from '@nestjs/testing';
import { PlaybackStatePersistenceService } from './playback-state-persistence.service';
import { PLAYBACK_REDIS } from '../utils/playback-redis.constants';
import { Redis } from 'ioredis';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PlaybackState } from '@repo/contracts';

describe('PlaybackStatePersistenceService', () => {
  let service: PlaybackStatePersistenceService;
  let redisMock: DeepMocked<Redis>;
  let connMock: DeepMocked<Redis>;

  const userId = 'user-1';
  const sessionId = 'session-1';
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
      const multiMock = {
        set: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([['error', 'OK']]),
      };
      connMock.multi.mockReturnValue(multiMock as any);

      const result = await service.createIfAbsent(userId, sessionId, initialState);

      expect(result.userId).toBe(userId);
      expect(result.version).toBe(1);
      expect(connMock.watch).toHaveBeenCalled();
      expect(multiMock.set).toHaveBeenCalled();
      expect(connMock.quit).toHaveBeenCalled();
    });

    it('should throw ConflictException if state already exists', async () => {
      connMock.get.mockResolvedValueOnce(JSON.stringify({ version: 1 }));

      await expect(service.createIfAbsent(userId, sessionId, initialState)).rejects.toThrow(
        ConflictException,
      );

      expect(connMock.unwatch).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if watch fails', async () => {
      connMock.watch.mockRejectedValueOnce(new Error('Redis down'));

      await expect(service.createIfAbsent(userId, sessionId, initialState)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should retry if exec returns null (concurrent update)', async () => {
      connMock.get.mockResolvedValue(null);
      const multiMock = {
        set: vi.fn().mockReturnThis(),
        exec: vi
          .fn()
          .mockResolvedValueOnce(null) // First attempt fails
          .mockResolvedValueOnce([['error', 'OK']]), // Second attempt succeeds
      };
      connMock.multi.mockReturnValue(multiMock as any);

      const promise = service.createIfAbsent(userId, sessionId, initialState);

      // Fast-forward through sleep
      await vi.runAllTimersAsync();

      const result = await promise;
      expect(result.version).toBe(1);
      expect(connMock.multi).toHaveBeenCalledTimes(2);
    });

    it('should throw ServiceUnavailableException after max retries', async () => {
      connMock.get.mockResolvedValue(null);
      const multiMock = {
        set: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(null), // Always fails
      };
      connMock.multi.mockReturnValue(multiMock as any);

      let caughtError: any;
      const promise = service.createIfAbsent(userId, sessionId, initialState).catch((err) => {
        caughtError = err;
      });

      // Advance timers enough to trigger all retries
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

      await expect(service.createIfAbsent(userId, sessionId, initialState)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(connMock.unwatch).toHaveBeenCalled();
    });
  });

  describe('applyMutation', () => {
    const existingState: PlaybackState = {
      userId,
      sessionId,
      activeDeviceId: 'device-1',
      trackData: initialState.trackData,
      queue: [],
      version: 1,
      updatedAt: new Date().toISOString(),
      deviceName: 'test',
      deviceIcon: 'mobile',
      isPlaying: false,
      currentTime: 0,
      volume: 0.8,
      repeatMode: 'off',
      shuffle: false,
      favorited: 'not-set',
      inLibrary: false,
    };

    it('should successfully apply mutation', async () => {
      connMock.get.mockResolvedValueOnce(JSON.stringify(existingState));
      const multiMock = {
        set: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([['error', 'OK']]),
      };
      connMock.multi.mockReturnValue(multiMock as any);

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
      const multiMock = {
        set: vi.fn().mockReturnThis(),
        exec: vi
          .fn()
          .mockResolvedValueOnce(null) // First attempt fails
          .mockResolvedValueOnce([['error', 'OK']]), // Second attempt succeeds
      };
      connMock.multi.mockReturnValue(multiMock as any);

      // Trigger the process
      const promise = service.applyMutation(userId, 1, (curr) => ({ ...curr, isPlaying: true }));

      // Advance timers to trigger retry
      await vi.runAllTimersAsync();

      const result = await promise;
      expect(result.isPlaying).toBe(true);
      expect(result.version).toBe(2);
      expect(connMock.multi).toHaveBeenCalledTimes(2);
    });

    it('should throw ServiceUnavailableException after max retries', async () => {
      connMock.get.mockResolvedValue(JSON.stringify(existingState));
      const multiMock = {
        set: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(null), // Always fails
      };
      connMock.multi.mockReturnValue(multiMock as any);

      let caughtError: any;
      const promise = service
        .applyMutation(userId, 1, (curr) => curr)
        .catch((err) => {
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
