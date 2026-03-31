import { BadRequestException } from '@nestjs/common';
import { PlaybackState, PlaybackStatePayload } from '@repo/contracts';
import { createMock } from '@repo/testing/nestjs';
import { describe, expect, it } from 'vitest';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { SetPlaybackStateCommand } from '../impl/set-playback-state.command';
import { SetPlaybackStateHandler } from './set-playback-state.handler';

describe('SetPlaybackStateHandler', () => {
  const userId = 'user-1';
  const sessionId = 'session-1';

  const statePayload: PlaybackStatePayload = {
    userId,
    sessionId,
    activeDeviceId: 'device-1',
    deviceName: 'Web',
    deviceIcon: 'desktop',
    isPlaying: false,
    currentTime: 0,
    volume: 0.8,
    repeatMode: 'off',
    shuffle: false,
    favorited: 'not-set',
    inLibrary: false,
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
  };

  const initialState: PlaybackState = {
    ...statePayload,
    version: 1,
    updatedAt: new Date().toISOString(),
  };

  it('initializes state and claims device when expectedVersion is 0', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetPlaybackStateHandler(persistence);
    const command = new SetPlaybackStateCommand(userId, sessionId, 'device-1', 'Web', 'desktop', {
      state: statePayload,
      expectedVersion: 0,
      claimActiveDevice: true,
    });

    persistence.createIfAbsent.mockResolvedValue(initialState);

    const result = await handler.execute(command);
    expect(result).toEqual(initialState);
    expect(persistence.createIfAbsent).toHaveBeenCalled();
  });

  it('initializes state without claiming device when expectedVersion is 0', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetPlaybackStateHandler(persistence);
    const command = new SetPlaybackStateCommand(userId, sessionId, 'device-1', 'Web', 'desktop', {
      state: statePayload,
      expectedVersion: 0,
      claimActiveDevice: false,
    });

    persistence.createIfAbsent.mockResolvedValue(initialState);

    await handler.execute(command);
    expect(persistence.createIfAbsent).toHaveBeenCalledWith(
      userId,
      sessionId,
      expect.objectContaining({
        activeDeviceId: '', // Set to empty string in handler if not claiming
      }),
    );
  });

  it('updates state and claims device when expectedVersion > 0', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetPlaybackStateHandler(persistence);
    const command = new SetPlaybackStateCommand(
      userId,
      sessionId,
      'device-new',
      'New Device',
      'mobile',
      {
        state: statePayload,
        expectedVersion: 1,
        claimActiveDevice: true,
      },
    );

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      const result = merge(initialState);
      return { ...initialState, ...result } as PlaybackState;
    });

    const result = await handler.execute(command);
    expect(result.activeDeviceId).toBe('device-new');
    expect(result.deviceName).toBe('New Device');
    expect(result.deviceIcon).toBe('mobile');
  });

  it('updates state without claiming device when expectedVersion > 0', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetPlaybackStateHandler(persistence);
    const command = new SetPlaybackStateCommand(
      userId,
      sessionId,
      'device-new',
      'New Device',
      'mobile',
      {
        state: statePayload,
        expectedVersion: 1,
        claimActiveDevice: false,
      },
    );

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      const result = merge(initialState);
      return { ...initialState, ...result } as PlaybackState;
    });

    const result = await handler.execute(command);
    expect(result.activeDeviceId).toBe('device-1'); // Preserved from initialState
  });

  it('throws BadRequestException on Zod validation failure', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetPlaybackStateHandler(persistence);
    const command = new SetPlaybackStateCommand(userId, sessionId, 'device-1', 'Web', 'desktop', {
      state: { ...statePayload, trackData: { ...statePayload.trackData, duration: -1 } } as any,
      expectedVersion: 0,
      claimActiveDevice: true,
    });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });

  it('uses default expectedVersion: 0 and claimActiveDevice: true if omitted', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetPlaybackStateHandler(persistence);
    const command = new SetPlaybackStateCommand(userId, sessionId, 'device-1', 'Web', 'desktop', {
      state: statePayload,
      // expectedVersion and claimActiveDevice are omitted
    } as any);

    persistence.createIfAbsent.mockResolvedValue(initialState);

    await handler.execute(command);

    // Check that createIfAbsent was called (expectedVersion 0 branch)
    expect(persistence.createIfAbsent).toHaveBeenCalled();
    // Check that activeDeviceId was set to device-1 (claimActiveDevice true branch)
    expect(persistence.createIfAbsent).toHaveBeenCalledWith(
      userId,
      sessionId,
      expect.objectContaining({
        activeDeviceId: 'device-1',
      }),
    );
  });
});
