import { BadRequestException } from '@nestjs/common';
import { PlaybackState } from '@repo/contracts';
import { createMock } from '@repo/testing/nestjs';
import { describe, expect, it } from 'vitest';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { SetQueueCommand } from '../impl/set-queue.command';
import { SetQueueHandler } from './set-queue.handler';

describe('SetQueueHandler', () => {
  const userId = 'user-1';
  const sessionId = 'session-1';
  const initialState: PlaybackState = {
    userId,
    sessionId,
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
    queue: [],
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

  it('updates the queue items', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetQueueHandler(persistence);
    const newQueue = [{ track: initialState.trackData, position: 0 }];
    const command = new SetQueueCommand(userId, sessionId, {
      items: newQueue,
      expectedVersion: 1,
    });

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      return { ...initialState, ...merge(initialState) } as PlaybackState;
    });

    const result = await handler.execute(command);
    expect(result.queue).toHaveLength(1);
    expect(result.queue[0].track.title).toBe('Track');
  });

  it('throws BadRequestException when expectedVersion is 0', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetQueueHandler(persistence);
    const command = new SetQueueCommand(userId, sessionId, {
      items: [],
      expectedVersion: 0,
    });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });
});
