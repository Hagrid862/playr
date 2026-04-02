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
import { ShuffleQueueCommand } from '../impl/shuffle-queue.command';
import { ShuffleQueueHandler } from './shuffle-queue.handler';

describe('ShuffleQueueHandler', () => {
  const userId = 'user-1';
  const sessionId = 'session-1';
  const initialState: PlaybackState = playbackStateFixture({
    userId,
    activeDeviceId: 'device-1',
    queue: [
      fixtureQueueItem({
        queueId: '01900000-0000-7000-8000-000000000001',
        position: 0,
        originalPosition: 0,
        type: 'queue',
      }),
      fixtureQueueItem({
        queueId: '01900000-0000-7000-8000-000000000002',
        position: 1,
        originalPosition: 1,
        type: 'queue',
        track: { ...fixtureTrack, id: 'track-2', trackId: 'track-2' },
      }),
      fixtureQueueItem({
        queueId: '01900000-0000-7000-8000-000000000003',
        position: 2,
        originalPosition: 2,
        type: 'playingNext',
        track: { ...fixtureTrack, id: 'track-3', trackId: 'track-3' },
      }),
    ],
    currentTime: 10,
    volume: 0.5,
    isPlaying: true,
  });

  it('is a no-op and returns the current queue unchanged', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new ShuffleQueueHandler(persistence);
    const command = new ShuffleQueueCommand(userId, sessionId, {
      expectedVersion: 1,
    });

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      return { ...initialState, ...merge(initialState) } as PlaybackState;
    });

    const result = await handler.execute(command);
    expect(result.queue).toEqual(initialState.queue);
    expect(result.queue).toHaveLength(3);
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
