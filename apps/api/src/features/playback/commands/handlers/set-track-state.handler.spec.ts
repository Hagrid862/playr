import { BadRequestException } from '@nestjs/common';
import { PlaybackState } from '@repo/contracts';
import { createMock } from '@repo/testing/nestjs';
import { describe, expect, it } from 'vitest';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { playbackStateFixture } from '../../test-utils/playback-state.fixture';
import { SetTrackStateCommand } from '../impl/set-track-state.command';
import { SetTrackStateHandler } from './set-track-state.handler';

describe('SetTrackStateHandler', () => {
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

  const initialState: PlaybackState = playbackStateFixture({
    userId,
    activeDeviceId: 'device-1',
    trackData,
    queue: [],
    currentTime: 10,
    volume: 0.5,
    version: 1,
    isPlaying: true,
  });

  it('updates track state with valid data', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetTrackStateHandler(persistence);
    const newTrack = { ...trackData, title: 'New Title' };
    const command = new SetTrackStateCommand(userId, sessionId, {
      track: newTrack,
      expectedVersion: 1,
    });

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      return { ...initialState, ...merge(initialState) } as PlaybackState;
    });

    const result = await handler.execute(command);
    expect(result.trackData.title).toBe('New Title');
    expect(persistence.applyMutation).toHaveBeenCalled();
  });

  it('throws BadRequestException when expectedVersion is 0', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetTrackStateHandler(persistence);
    const command = new SetTrackStateCommand(userId, sessionId, {
      track: trackData,
      expectedVersion: 0,
    });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException on invalid track data', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetTrackStateHandler(persistence);
    const command = new SetTrackStateCommand(userId, sessionId, {
      track: { ...trackData, duration: 'invalid' } as any,
      expectedVersion: 1,
    });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });
});
