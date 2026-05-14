import { BadRequestException } from '@nestjs/common';
import { PlaybackState } from '@repo/contracts';
import { createMock } from '@repo/testing/nestjs';
import { describe, expect, it } from 'vitest';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { playbackStateFixture } from '../../test-utils/playback-state.fixture';
import { SetVolumeLevelStateCommand } from '../impl/set-volume-level-state.command';
import { SetVolumeLevelStateHandler } from './set-volume-level.handler';

describe('SetVolumeLevelStateHandler', () => {
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

  it('updates volume level', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetVolumeLevelStateHandler(persistence);
    const command = new SetVolumeLevelStateCommand(userId, sessionId, {
      volume: 0.8,
      expectedVersion: 1,
    });

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      return { ...initialState, ...merge(initialState) } as PlaybackState;
    });

    const result = await handler.execute(command);
    expect(result.volume).toBe(0.8);
    expect(persistence.applyMutation).toHaveBeenCalledWith(userId, 1, expect.any(Function));
  });

  it('throws BadRequestException when expectedVersion is 0', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetVolumeLevelStateHandler(persistence);
    const command = new SetVolumeLevelStateCommand(userId, sessionId, {
      volume: 0.8,
      expectedVersion: 0,
    });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });
});
