import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { describe, expect, it } from 'vitest';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { SetCurrentTimeStateCommand } from '../impl/set-current-time-state.command';
import { SetCurrentTimeStateHandler } from './set-current-time-state.handler';

describe('SetCurrentTimeStateHandler', () => {
  it('updates currentTime when command comes from active device', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetCurrentTimeStateHandler(
      persistence as DeepMocked<PlaybackStatePersistenceService>,
    );
    const command = new SetCurrentTimeStateCommand('user-1', 'session-1', 'device-1', {
      currentTime: 42,
      expectedVersion: 3,
    });

    persistence.applyMutation.mockImplementation(async (_userId, _expectedVersion, merge) => {
      return merge({
        sessionId: 'session-1',
        activeDeviceId: 'device-1',
        userId: 'user-1',
        deviceName: 'Web',
        deviceIcon: 'desktop',
        isPlaying: true,
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
        volume: 0.7,
        repeatMode: 'off',
        shuffle: false,
        favorited: 'not-set',
        inLibrary: false,
        version: 3,
        updatedAt: new Date().toISOString(),
      });
    });

    const result = await handler.execute(command);

    expect(result.currentTime).toBe(42);
  });

  it('allows currentTime updates from non-active devices', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetCurrentTimeStateHandler(
      persistence as DeepMocked<PlaybackStatePersistenceService>,
    );
    const command = new SetCurrentTimeStateCommand('user-1', 'session-1', 'device-2', {
      currentTime: 42,
      expectedVersion: 3,
    });

    persistence.applyMutation.mockImplementation(async (_userId, _expectedVersion, merge) => {
      return merge({
        sessionId: 'session-1',
        activeDeviceId: 'device-1',
        userId: 'user-1',
        deviceName: 'Web',
        deviceIcon: 'desktop',
        isPlaying: true,
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
        volume: 0.7,
        repeatMode: 'off',
        shuffle: false,
        favorited: 'not-set',
        inLibrary: false,
        version: 3,
        updatedAt: new Date().toISOString(),
      });
    });

    const result = await handler.execute(command);
    expect(result.currentTime).toBe(42);
  });
});
