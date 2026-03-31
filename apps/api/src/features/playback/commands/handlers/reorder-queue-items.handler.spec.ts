import { BadRequestException } from '@nestjs/common';
import { PlaybackState } from '@repo/contracts';
import { createMock } from '@repo/testing/nestjs';
import { describe, expect, it } from 'vitest';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { ReorderQueueItemsCommand } from '../impl/reorder-queue-items.command';
import { ReorderQueueItemsHandler } from './reorder-queue-items.handler';

describe('ReorderQueueItemsHandler', () => {
  const userId = 'user-1';
  const sessionId = 'session-1';

  const mockTrack = { id: 't1' } as any;

  const initialState: PlaybackState = {
    userId,
    sessionId,
    activeDeviceId: 'device-1',
    trackData: mockTrack,
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

  it('reorders the queue items', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new ReorderQueueItemsHandler(persistence);
    const command = new ReorderQueueItemsCommand(userId, sessionId, {
      items: [
        { queueId: 'q2', track: initialState.queue[1].track, position: 1 },
        { queueId: 'q1', track: initialState.queue[0].track, position: 0 },
      ],
      expectedVersion: 1,
    });

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      return { ...initialState, ...merge(initialState) } as PlaybackState;
    });

    const result = await handler.execute(command);
    expect(result.queue[0].queueId).toBe('q2');
    expect(result.queue[0].position).toBe(0);
    expect(result.queue[1].queueId).toBe('q1');
    expect(result.queue[1].position).toBe(1);
  });

  it('throws BadRequestException on mismatched queue length', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new ReorderQueueItemsHandler(persistence);
    const command = new ReorderQueueItemsCommand(userId, sessionId, {
      items: [{ queueId: 'q2', track: initialState.queue[1].track, position: 1 }],
      expectedVersion: 1,
    });

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      return merge(initialState) as any;
    });

    await expect(handler.execute(command)).rejects.toThrow(
      'Reorder list must include every queue item exactly once.',
    );
  });

  it('throws BadRequestException on mismatched queue IDs', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new ReorderQueueItemsHandler(persistence);
    const command = new ReorderQueueItemsCommand(userId, sessionId, {
      items: [
        { queueId: 'q1', track: initialState.queue[0].track, position: 0 },
        { queueId: 'q-wrong', track: mockTrack, position: 1 },
      ],
      expectedVersion: 1,
    });

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      return merge(initialState) as any;
    });

    await expect(handler.execute(command)).rejects.toThrow(
      'Reorder list must include every queue item exactly once.',
    );
  });

  it('throws BadRequestException when expectedVersion is 0', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new ReorderQueueItemsHandler(persistence);
    const command = new ReorderQueueItemsCommand(userId, sessionId, {
      items: [],
      expectedVersion: 0,
    });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });
});
