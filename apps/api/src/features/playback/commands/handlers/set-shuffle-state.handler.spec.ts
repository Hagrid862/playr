import { BadRequestException } from '@nestjs/common';
import { PlaybackState } from '@repo/contracts';
import { createMock } from '@repo/testing/nestjs';
import { describe, expect, it } from 'vitest';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { playbackStateFixture } from '../../test-utils/playback-state.fixture';
import { SetShuffleStateCommand } from '../impl/set-shuffle-state.command';
import { SetShuffleStateHandler } from './set-shuffle-state.handler';

describe('SetShuffleStateHandler', () => {
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
    queue: [],
    currentTime: 10,
    volume: 0.5,
    version: 1,
    isPlaying: true,
  });

  it('updates shuffle state', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetShuffleStateHandler(persistence);
    const command = new SetShuffleStateCommand(userId, sessionId, {
      shuffle: true,
      expectedVersion: 1,
    });

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      return { ...initialState, ...merge(initialState) } as PlaybackState;
    });

    const result = await handler.execute(command);
    expect(result.shuffle).toBe(true);
    expect(persistence.applyMutation).toHaveBeenCalledWith(userId, 1, expect.any(Function));
  });

  it('returns unchanged state when shuffle value is same', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetShuffleStateHandler(persistence);
    const stateWithShuffleFalse = { ...initialState, shuffle: false };
    const command = new SetShuffleStateCommand(userId, sessionId, {
      shuffle: false,
      expectedVersion: 1,
    });

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      const merged = merge(stateWithShuffleFalse);
      return { ...stateWithShuffleFalse, ...merged } as PlaybackState;
    });

    const result = await handler.execute(command);
    expect(result.shuffle).toBe(false);
    expect(persistence.applyMutation).toHaveBeenCalledWith(userId, 1, expect.any(Function));
  });

  it('throws BadRequestException when expectedVersion is 0', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetShuffleStateHandler(persistence);
    const command = new SetShuffleStateCommand(userId, sessionId, {
      shuffle: true,
      expectedVersion: 0,
    });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });
});
