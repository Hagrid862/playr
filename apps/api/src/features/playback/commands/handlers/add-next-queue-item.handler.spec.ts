import { BadRequestException } from '@nestjs/common';
import { PlaybackState } from '@repo/contracts';
import { createMock } from '@repo/testing/nestjs';
import { describe, expect, it } from 'vitest';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { SetNextQueueItemCommand } from '../impl/set-next-queue-item.command';
import { SetNextQueueItemHandler } from './add-next-queue-item.handler';

describe('SetNextQueueItemHandler', () => {
  const userId = 'user-1';
  const sessionId = 'session-1';
  const trackData = {
    id: 'track-1',
    trackId: 't1',
    title: 'Track',
    artists: ['Artist'],
    albumArt: null,
    albumName: 'Album',
    albumId: 'album-1',
    duration: 120,
    explicit: false,
  };

  const initialState: PlaybackState = {
    userId,
    sessionId,
    activeDeviceId: 'device-1',
    trackData,
    queue: [
      { track: trackData, position: 0, queueId: 'q1' },
      { track: { ...trackData, id: 'track-2' }, position: 1, queueId: 'q2' },
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

  it('adds track as next item in queue', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetNextQueueItemHandler(persistence);
    const newTrack = { track: { ...trackData, id: 'track-next' }, position: 0, queueId: 'next-1' };
    const command = new SetNextQueueItemCommand(userId, sessionId, {
      track: newTrack,
      expectedVersion: 1,
    });

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      return { ...initialState, ...merge(initialState) } as PlaybackState;
    });

    const result = await handler.execute(command);
    expect(result.queue).toHaveLength(3);
    const inserted = result.queue.find((i) => i.track.id === 'track-next');
    expect(inserted?.position).toBe(1);
  });

  it('adds track at position 0 if current track not in queue', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetNextQueueItemHandler(persistence);
    const newTrack = { track: { ...trackData, id: 'track-next' }, position: 0, queueId: 'next-2' };
    const command = new SetNextQueueItemCommand(userId, sessionId, {
      track: newTrack,
      expectedVersion: 1,
    });

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      const stateWithoutCurrentTrack = {
        ...initialState,
        trackData: { ...trackData, id: 'other' },
      };
      return { ...stateWithoutCurrentTrack, ...merge(stateWithoutCurrentTrack) } as PlaybackState;
    });

    const result = await handler.execute(command);
    expect(result.queue[0].track.id).toBe('track-next');
  });

  it('throws BadRequestException when expectedVersion is 0', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetNextQueueItemHandler(persistence);
    const command = new SetNextQueueItemCommand(userId, sessionId, {
      track: { track: trackData, position: 0, queueId: 'next-3' },
      expectedVersion: 0,
    });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });
});
