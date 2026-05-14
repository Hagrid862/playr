import { BadRequestException } from '@nestjs/common';
import { PlaybackState } from '@repo/contracts';
import { createMock } from '@repo/testing/nestjs';
import { describe, expect, it } from 'vitest';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { MoveQueueItemCommand } from '../impl/move-queue-item.command';
import { MoveQueueItemHandler } from './move-queue-item.handler';

describe('MoveQueueItemHandler', () => {
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

  it('moves an item to a new position', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new MoveQueueItemHandler(persistence);
    const command = new MoveQueueItemCommand(userId, sessionId, {
      itemId: 'q1',
      newPosition: 2,
      expectedVersion: 1,
    });

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      return { ...initialState, ...merge(initialState) } as PlaybackState;
    });

    const result = await handler.execute(command);
    expect(result.queue[2].queueId).toBe('q1');
    expect(result.queue[2].position).toBe(2);
  });

  it('throws BadRequestException if item not found', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new MoveQueueItemHandler(persistence);
    const command = new MoveQueueItemCommand(userId, sessionId, {
      itemId: 'q-not-exists',
      newPosition: 0,
      expectedVersion: 1,
    });

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      return merge(initialState) as any;
    });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when expectedVersion is 0', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new MoveQueueItemHandler(persistence);
    const command = new MoveQueueItemCommand(userId, sessionId, {
      itemId: 'q1',
      newPosition: 1,
      expectedVersion: 0,
    });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });
});
