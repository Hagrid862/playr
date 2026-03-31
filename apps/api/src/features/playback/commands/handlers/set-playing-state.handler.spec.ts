import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { describe, expect, it } from 'vitest';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { SetPlayingStateCommand } from '../impl/set-playing-state.command';
import { SetPlayingStateHandler } from './set-playing-state.handler';

describe('SetPlayingStateHandler', () => {
  it('claims active device when playback starts', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetPlayingStateHandler(persistence as DeepMocked<PlaybackStatePersistenceService>);
    const command = new SetPlayingStateCommand('user-1', 'session-1', 'device-1', 'Web Player', 'desktop', {
      isPlaying: true,
      expectedVersion: 3,
    });

    persistence.applyMutation.mockImplementation(async (_userId, _expectedVersion, merge) => {
      return merge({
        sessionId: 'session-1',
        activeDeviceId: 'device-2',
        userId: 'user-1',
        deviceName: 'Old',
        deviceIcon: 'desktop',
        isPlaying: false,
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
        currentTime: 0,
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

    expect(result.activeDeviceId).toBe('device-1');
    expect(result.deviceName).toBe('Web Player');
    expect(result.isPlaying).toBe(true);
  });
});
