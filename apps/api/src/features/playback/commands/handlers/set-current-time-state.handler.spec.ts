import { BadRequestException } from '@nestjs/common';
import { PlaybackState } from '@repo/contracts';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { describe, expect, it } from 'vitest';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { playbackStateFixture } from '../../test-utils/playback-state.fixture';
import { SetCurrentTimeStateCommand } from '../impl/set-current-time-state.command';
import { SetCurrentTimeStateHandler } from './set-current-time-state.handler';

describe('SetCurrentTimeStateHandler', () => {
  let handler: SetCurrentTimeStateHandler;
  let persistence: DeepMocked<PlaybackStatePersistenceService>;

  const userId = 'user-1';
  const sessionId = 'session-1';
  const activeDeviceId = 'device-1';

  const initialState: PlaybackState = playbackStateFixture({
    userId,
    activeDeviceId,
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
    version: 3,
    isPlaying: true,
  });

  it('updates currentTime from the active device', async () => {
    persistence = createMock<PlaybackStatePersistenceService>();
    handler = new SetCurrentTimeStateHandler(persistence);

    const command = new SetCurrentTimeStateCommand(userId, sessionId, activeDeviceId, {
      currentTime: 42,
      expectedVersion: 3,
    });

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      const result = merge(initialState);
      return { ...initialState, ...result } as PlaybackState;
    });

    const result = await handler.execute(command);
    expect(result.currentTime).toBe(42);
    expect(persistence.applyMutation).toHaveBeenCalledWith(userId, 3, expect.any(Function));
  });

  it('allows currentTime updates from non-active devices', async () => {
    persistence = createMock<PlaybackStatePersistenceService>();
    handler = new SetCurrentTimeStateHandler(persistence);

    const command = new SetCurrentTimeStateCommand(userId, sessionId, 'device-2', {
      currentTime: 42,
      expectedVersion: 3,
    });

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      const result = merge(initialState);
      return { ...initialState, ...result } as PlaybackState;
    });

    const result = await handler.execute(command);
    expect(result.currentTime).toBe(42);
  });

  it('throws BadRequestException when expectedVersion is 0', async () => {
    persistence = createMock<PlaybackStatePersistenceService>();
    handler = new SetCurrentTimeStateHandler(persistence);
    const command = new SetCurrentTimeStateCommand(userId, sessionId, activeDeviceId, {
      currentTime: 42,
      expectedVersion: 0,
    });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when currentTime is greater than duration', async () => {
    persistence = createMock<PlaybackStatePersistenceService>();
    handler = new SetCurrentTimeStateHandler(persistence);
    const command = new SetCurrentTimeStateCommand(userId, sessionId, activeDeviceId, {
      currentTime: 150,
      expectedVersion: 3,
    });

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      return merge(initialState) as PlaybackState;
    });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });
});
