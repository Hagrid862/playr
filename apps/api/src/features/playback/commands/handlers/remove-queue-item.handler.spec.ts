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
import { RemoveQueueItemCommand } from '../impl/remove-queue-item.command';
import { RemoveQueueItemHandler } from './remove-queue-item.handler';

describe('RemoveQueueItemHandler', () => {
  const userId = 'user-1';
  const sessionId = 'session-1';
  const initialState: PlaybackState = playbackStateFixture({
    userId,
    activeDeviceId: 'device-1',
    trackData: fixtureTrack,
    queue: [
      fixtureQueueItem({
        queueId: '01900000-0000-7000-8000-000000000001',
        track: { ...fixtureTrack, id: 'track-1', trackId: 'track-1' },
        position: 0,
        originalPosition: 0,
      }),
      fixtureQueueItem({
        queueId: '01900000-0000-7000-8000-000000000002',
        track: { ...fixtureTrack, id: 'track-2', trackId: 'track-2' },
        position: 1,
        originalPosition: 1,
      }),
    ],
    currentTime: 10,
    volume: 0.5,
    version: 1,
    isPlaying: true,
  });

  it('removes an item from the queue', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new RemoveQueueItemHandler(persistence);
    const command = new RemoveQueueItemCommand(userId, sessionId, {
      itemId: initialState.queue[0].queueId,
      expectedVersion: 1,
    });

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      return { ...initialState, ...merge(initialState) } as PlaybackState;
    });

    const result = await handler.execute(command);
    expect(result.queue).toHaveLength(1);
    expect(result.queue[0].queueId).toBe(initialState.queue[1].queueId);
    expect(result.queue[0].position).toBe(0);
  });

  it('throws BadRequestException if item not found', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new RemoveQueueItemHandler(persistence);
    const command = new RemoveQueueItemCommand(userId, sessionId, {
      itemId: '01900000-0000-7000-8000-00000000dead',
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
      itemId: initialState.queue[0].queueId,
      expectedVersion: 0,
    });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });
});
