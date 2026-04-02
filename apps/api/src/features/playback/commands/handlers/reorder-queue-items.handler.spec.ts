import { BadRequestException } from '@nestjs/common';
import { PlaybackState } from '@repo/contracts';
import { createMock } from '@repo/testing/nestjs';
import { describe, expect, it } from 'vitest';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import {
  fixtureQueueItem,
  fixtureTrack,
  playbackStateFixture,
} from '../../test-utils/playback-state.fixture';
import { ReorderQueueItemsCommand } from '../impl/reorder-queue-items.command';
import { ReorderQueueItemsHandler } from './reorder-queue-items.handler';

describe('ReorderQueueItemsHandler', () => {
  const userId = 'user-1';
  const sessionId = 'session-1';

  const t1 = { ...fixtureTrack, id: 'track-1', trackId: 'track-1' };
  const t2 = { ...fixtureTrack, id: 'track-2', trackId: 'track-2' };

  const initialState: PlaybackState = playbackStateFixture({
    userId,
    activeDeviceId: 'device-1',
    trackData: fixtureTrack,
    queue: [
      fixtureQueueItem({
        queueId: '01900000-0000-7000-8000-000000000001',
        track: t1,
        position: 0,
        originalPosition: 0,
      }),
      fixtureQueueItem({
        queueId: '01900000-0000-7000-8000-000000000002',
        track: t2,
        position: 1,
        originalPosition: 1,
      }),
    ],
    currentTime: 10,
    volume: 0.5,
    version: 1,
    isPlaying: true,
  });

  it('reorders the queue items', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new ReorderQueueItemsHandler(persistence);
    const command = new ReorderQueueItemsCommand(userId, sessionId, {
      items: [
        { ...initialState.queue[1], position: 0, originalPosition: 0 },
        { ...initialState.queue[0], position: 1, originalPosition: 1 },
      ],
      expectedVersion: 1,
    });

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      return { ...initialState, ...merge(initialState) } as PlaybackState;
    });

    const result = await handler.execute(command);
    expect(result.queue[0].queueId).toBe(initialState.queue[1].queueId);
    expect(result.queue[0].position).toBe(0);
    expect(result.queue[0].originalPosition).toBe(1);
    expect(result.queue[1].queueId).toBe(initialState.queue[0].queueId);
    expect(result.queue[1].position).toBe(1);
    expect(result.queue[1].originalPosition).toBe(0);
  });

  it('throws BadRequestException on mismatched queue length', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new ReorderQueueItemsHandler(persistence);
    const command = new ReorderQueueItemsCommand(userId, sessionId, {
      items: [{ ...initialState.queue[1], position: 0, originalPosition: 0 }],
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
        { ...initialState.queue[0], position: 0, originalPosition: 0 },
        {
          ...initialState.queue[1],
          queueId: '01900000-0000-7000-8000-00000000dead',
          position: 1,
          originalPosition: 1,
        },
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
