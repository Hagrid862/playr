import { PlaybackState } from '@repo/contracts';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { SetPlayingStateCommand } from '../impl/set-playing-state.command';
import { SetPlayingStateHandler } from './set-playing-state.handler';

describe('SetPlayingStateHandler', () => {
  let handler: SetPlayingStateHandler;
  let persistence: DeepMocked<PlaybackStatePersistenceService>;

  const userId = 'user-1';
  const sessionId = 'session-1';
  const activeDeviceId = 'device-1';

  const initialState: PlaybackState = {
    userId,
    sessionId,
    activeDeviceId,
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
  };

  it('updates isPlaying to true and claims the device', async () => {
    persistence = createMock<PlaybackStatePersistenceService>();
    handler = new SetPlayingStateHandler(persistence);

    const command = new SetPlayingStateCommand(
      userId,
      sessionId,
      'device-2',
      'Web Player',
      'desktop',
      {
        isPlaying: true,
        expectedVersion: 3,
      },
    );

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      const result = merge(initialState);
      return { ...initialState, ...result } as PlaybackState;
    });

    const result = await handler.execute(command);
    expect(result.activeDeviceId).toBe('device-2');
    expect(result.deviceName).toBe('Web Player');
    expect(result.isPlaying).toBe(true);
  });

  it('updates isPlaying to false and preserves current device', async () => {
    persistence = createMock<PlaybackStatePersistenceService>();
    handler = new SetPlayingStateHandler(persistence);

    const command = new SetPlayingStateCommand(
      userId,
      sessionId,
      'device-2',
      'Web Player',
      'desktop',
      {
        isPlaying: false,
        expectedVersion: 3,
      },
    );

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      const result = merge(initialState);
      return { ...initialState, ...result } as PlaybackState;
    });

    const result = await handler.execute(command);
    expect(result.isPlaying).toBe(false);
    expect(result.activeDeviceId).toBe('device-1'); // From initialState
  });

  it('throws BadRequestException when expectedVersion is 0', async () => {
    persistence = createMock<PlaybackStatePersistenceService>();
    handler = new SetPlayingStateHandler(persistence);
    const command = new SetPlayingStateCommand(
      userId,
      sessionId,
      activeDeviceId,
      'Web',
      'desktop',
      {
        isPlaying: true,
        expectedVersion: 0,
      },
    );

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });
});
