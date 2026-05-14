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
import { MoveQueueItemCommand } from '../impl/move-queue-item.command';
import { MoveQueueItemHandler } from './move-queue-item.handler';

describe('MoveQueueItemHandler', () => {
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
      fixtureQueueItem({
        queueId: '01900000-0000-7000-8000-000000000003',
        track: { ...fixtureTrack, id: 'track-3', trackId: 'track-3' },
        position: 2,
        originalPosition: 2,
      }),
    ],
    currentTime: 10,
    volume: 0.5,
    version: 1,
    isPlaying: true,
  });

  it('moves an item to a new position', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new MoveQueueItemHandler(persistence);
    const command = new MoveQueueItemCommand(userId, sessionId, {
      itemId: '01900000-0000-7000-8000-000000000001',
      newPosition: 2,
      expectedVersion: 1,
    });

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      return { ...initialState, ...merge(initialState) } as PlaybackState;
    });

    const result = await handler.execute(command);
    expect(result.queue[2].queueId).toBe('01900000-0000-7000-8000-000000000001');
    expect(result.queue[2].position).toBe(2);
    expect(result.queue[2].originalPosition).toBe(0);
  });

  it('throws BadRequestException if item not found', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new MoveQueueItemHandler(persistence);
    const command = new MoveQueueItemCommand(userId, sessionId, {
      itemId: '01900000-0000-7000-8000-00000000cafe',
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
      itemId: '01900000-0000-7000-8000-000000000001',
      newPosition: 1,
      expectedVersion: 0,
    });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });
});
