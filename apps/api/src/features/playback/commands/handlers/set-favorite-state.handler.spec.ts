import { BadRequestException } from '@nestjs/common';
import { PlaybackState } from '@repo/contracts';
import { createMock } from '@repo/testing/nestjs';
import { describe, expect, it } from 'vitest';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { LibraryTrackRepository } from '@/shared/repositories/library-track.repository';
import { PlaylistRepository } from '@/shared/repositories/playlist.repository';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { playbackStateFixture } from '../../test-utils/playback-state.fixture';
import { SetFavoriteStateCommand } from '../impl/set-favorite-state.command';
import { SetFavoriteStateHandler } from './set-favorite-state.handler';

describe('SetFavoriteStateHandler', () => {
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

  it('updates favorite state', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const libraryRepository = createMock<LibraryRepository>();
    const libraryTrackRepository = createMock<LibraryTrackRepository>();
    const playlistRepository = createMock<PlaylistRepository>();

    libraryRepository.getByUserId.mockResolvedValue({ id: 'lib-1' } as never);
    libraryTrackRepository.getByLibraryAndTrack.mockResolvedValue({ id: 'lt-1' } as never);

    const handler = new SetFavoriteStateHandler(
      persistence,
      libraryRepository,
      libraryTrackRepository,
      playlistRepository,
    );
    const command = new SetFavoriteStateCommand(userId, sessionId, {
      favorite: 'favorited',
      expectedVersion: 1,
    });

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      const merged = await Promise.resolve(merge(initialState));
      return { ...initialState, ...merged } as PlaybackState;
    });

    const result = await handler.execute(command);
    expect(result.favorited).toBe('favorited');
    expect(persistence.applyMutation).toHaveBeenCalledWith(userId, 1, expect.any(Function));
    expect(playlistRepository.setFavoritesMembership).toHaveBeenCalledWith('lib-1', 't1', true);
  });

  it('throws BadRequestException when expectedVersion is 0', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const libraryRepository = createMock<LibraryRepository>();
    const libraryTrackRepository = createMock<LibraryTrackRepository>();
    const playlistRepository = createMock<PlaylistRepository>();
    const handler = new SetFavoriteStateHandler(
      persistence,
      libraryRepository,
      libraryTrackRepository,
      playlistRepository,
    );
    const command = new SetFavoriteStateCommand(userId, sessionId, {
      favorite: 'favorited',
      expectedVersion: 0,
    });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });
});
