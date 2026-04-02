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
import { ClearQueueCommand } from '../impl/clear-queue.command';
import { ClearQueueHandler } from './clear-queue.handler';

describe('ClearQueueHandler', () => {
  const userId = 'user-1';
  const sessionId = 'session-1';
  const initialState: PlaybackState = playbackStateFixture({
    userId,
    activeDeviceId: 'device-1',
    trackData: {
      id: 'track-1',
      trackId: 't1',
      title: 'Track',
      artists: ['Artist'],
      albumArt: null,
      albumName: 'Album',
      albumId: 'album-1',
      duration: 120,
      explicit: false,
    },
    queue: [
      fixtureQueueItem({
        queueId: '01900000-0000-7000-8000-000000000001',
        track: { ...fixtureTrack, id: 't2', trackId: 't2' },
        position: 0,
        originalPosition: 0,
        type: 'queue',
      }),
    ],
    currentTime: 10,
    volume: 0.5,
    version: 1,
    isPlaying: true,
  });

  it('clears the queue', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new ClearQueueHandler(persistence);
    const command = new ClearQueueCommand(userId, sessionId, {
      expectedVersion: 1,
    });

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      return { ...initialState, ...merge(initialState) } as PlaybackState;
    });

    const result = await handler.execute(command);
    expect(result.queue).toHaveLength(0);
  });

  it('throws BadRequestException when expectedVersion is 0', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new ClearQueueHandler(persistence);
    const command = new ClearQueueCommand(userId, sessionId, {
      expectedVersion: 0,
    });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });
});
