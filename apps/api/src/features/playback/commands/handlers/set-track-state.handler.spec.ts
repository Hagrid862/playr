import { BadRequestException } from '@nestjs/common';
import { PlaybackState } from '@repo/contracts';
import { createMock } from '@repo/testing/nestjs';
import { describe, expect, it } from 'vitest';
import { PlaybackLibraryFlagsService } from '../../services/playback-library-flags.service';
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
    const libraryFlags = createMock<PlaybackLibraryFlagsService>();
    libraryFlags.resolveForTrack.mockResolvedValue({ favorited: 'not-set', inLibrary: false });

    const handler = new SetTrackStateHandler(persistence, libraryFlags);
    const newTrack = { ...trackData, title: 'New Title' };
    const command = new SetTrackStateCommand(userId, sessionId, {
      track: newTrack,
      expectedVersion: 1,
    });

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      const merged = await Promise.resolve(merge(initialState));
      return { ...initialState, ...merged } as PlaybackState;
    });

    const result = await handler.execute(command);
    expect(result.trackData.title).toBe('New Title');
    expect(persistence.applyMutation).toHaveBeenCalled();
    expect(libraryFlags.resolveForTrack).toHaveBeenCalledWith(userId, 't1');
  });

  it('throws BadRequestException when expectedVersion is 0', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const libraryFlags = createMock<PlaybackLibraryFlagsService>();
    const handler = new SetTrackStateHandler(persistence, libraryFlags);
    const command = new SetTrackStateCommand(userId, sessionId, {
      track: trackData,
      expectedVersion: 0,
    });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException on invalid track data', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const libraryFlags = createMock<PlaybackLibraryFlagsService>();
    const handler = new SetTrackStateHandler(persistence, libraryFlags);
    const command = new SetTrackStateCommand(userId, sessionId, {
      track: { ...trackData, duration: 'invalid' } as any,
      expectedVersion: 1,
    });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });
});
