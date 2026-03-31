import { BadRequestException } from '@nestjs/common';
import { PlaybackState } from '@repo/contracts';
import { createMock } from '@repo/testing/nestjs';
import { describe, expect, it } from 'vitest';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { ShuffleQueueCommand } from '../impl/shuffle-queue.command';
import { ShuffleQueueHandler } from './shuffle-queue.handler';

describe('ShuffleQueueHandler', () => {
  const userId = 'user-1';
  const sessionId = 'session-1';
  const initialState: PlaybackState = {
    userId,
    sessionId,
    activeDeviceId: 'device-1',
    trackData: { id: 't1' } as any,
    queue: [
      { track: { id: 'track-1' } as any, position: 0, queueId: 'q1' },
      { track: { id: 'track-2' } as any, position: 1, queueId: 'q2' },
      { track: { id: 'track-3' } as any, position: 2, queueId: 'q3' },
      { track: { id: 'track-4' } as any, position: 3, queueId: 'q4' },
      { track: { id: 'track-5' } as any, position: 4, queueId: 'q5' },
    ],
    currentTime: 10,
    volume: 0.5,
    repeatMode: 'off',
    shuffle: false,
    favorited: 'not-set',
    inLibrary: false,
    version: 1,
    updatedAt: new Date().toISOString(),
    deviceName: 'Web',
    deviceIcon: 'desktop',
    isPlaying: true,
  };

  it('shuffles the queue', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new ShuffleQueueHandler(persistence);
    const command = new ShuffleQueueCommand(userId, sessionId, {
      expectedVersion: 1,
    });

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      return { ...initialState, ...merge(initialState) } as PlaybackState;
    });

    const result = await handler.execute(command);
    expect(result.queue).toHaveLength(5);
    const originalIds = initialState.queue.map((i) => i.queueId).sort();
    const resultIds = result.queue.map((i) => i.queueId).sort();
    expect(resultIds).toEqual(originalIds);
  });

  it('throws BadRequestException when expectedVersion is 0', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new ShuffleQueueHandler(persistence);
    const command = new ShuffleQueueCommand(userId, sessionId, {
      expectedVersion: 0,
    });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });
});
