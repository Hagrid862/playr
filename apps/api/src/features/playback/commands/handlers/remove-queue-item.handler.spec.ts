import { BadRequestException } from '@nestjs/common';
import { PlaybackState } from '@repo/contracts';
import { createMock } from '@repo/testing/nestjs';
import { describe, expect, it } from 'vitest';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { RemoveQueueItemCommand } from '../impl/remove-queue-item.command';
import { RemoveQueueItemHandler } from './remove-queue-item.handler';

describe('RemoveQueueItemHandler', () => {
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

  it('removes an item from the queue', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new RemoveQueueItemHandler(persistence);
    const command = new RemoveQueueItemCommand(userId, sessionId, {
      itemId: 'q1',
      expectedVersion: 1,
    });

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      return { ...initialState, ...merge(initialState) } as PlaybackState;
    });

    const result = await handler.execute(command);
    expect(result.queue).toHaveLength(1);
    expect(result.queue[0].queueId).toBe('q2');
    expect(result.queue[0].position).toBe(0);
  });

  it('throws BadRequestException if item not found', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new RemoveQueueItemHandler(persistence);
    const command = new RemoveQueueItemCommand(userId, sessionId, {
      itemId: 'q-not-exists',
      expectedVersion: 1,
    });

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      return merge(initialState) as any;
    });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when expectedVersion is 0', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new RemoveQueueItemHandler(persistence);
    const command = new RemoveQueueItemCommand(userId, sessionId, {
      itemId: 'q1',
      expectedVersion: 0,
    });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });
});
