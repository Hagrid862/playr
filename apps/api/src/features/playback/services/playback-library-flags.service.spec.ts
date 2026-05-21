import { createMock, type DeepMocked } from '@repo/testing/nestjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { LibraryTrackRepository } from '@/shared/repositories/library-track.repository';
import { PlaylistRepository } from '@/shared/repositories/playlist.repository';
import { PlaybackLibraryFlagsService } from './playback-library-flags.service';

describe('PlaybackLibraryFlagsService', () => {
  let libraryRepository: DeepMocked<LibraryRepository>;
  let libraryTrackRepository: DeepMocked<LibraryTrackRepository>;
  let playlistRepository: DeepMocked<PlaylistRepository>;
  let service: PlaybackLibraryFlagsService;

  const userId = 'user-1';
  const trackId = 'track-1';

  beforeEach(() => {
    libraryRepository = createMock<LibraryRepository>();
    libraryTrackRepository = createMock<LibraryTrackRepository>();
    playlistRepository = createMock<PlaylistRepository>();
    service = new PlaybackLibraryFlagsService(
      libraryRepository,
      libraryTrackRepository,
      playlistRepository,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('resolveForTrack', () => {
    it('returns not-set and not in library when user has no library', async () => {
      libraryRepository.getByUserId.mockResolvedValue(null);

      const result = await service.resolveForTrack(userId, trackId);

      expect(result).toEqual({ favorited: 'not-set', inLibrary: false });
      expect(libraryTrackRepository.getByLibraryAndTrack).not.toHaveBeenCalled();
      expect(playlistRepository.isTrackInFavoritesPlaylist).not.toHaveBeenCalled();
    });

    it('returns not-set when track is not in library and not favorited', async () => {
      libraryRepository.getByUserId.mockResolvedValue({ id: 'lib-1' } as never);
      libraryTrackRepository.getByLibraryAndTrack.mockResolvedValue(null);
      playlistRepository.isTrackInFavoritesPlaylist.mockResolvedValue(false);

      const result = await service.resolveForTrack(userId, trackId);

      expect(libraryTrackRepository.getByLibraryAndTrack).toHaveBeenCalledWith('lib-1', trackId);
      expect(playlistRepository.isTrackInFavoritesPlaylist).toHaveBeenCalledWith('lib-1', trackId);
      expect(result).toEqual({ favorited: 'not-set', inLibrary: false });
    });

    it('returns favorited when track is in favorites playlist', async () => {
      libraryRepository.getByUserId.mockResolvedValue({ id: 'lib-1' } as never);
      libraryTrackRepository.getByLibraryAndTrack.mockResolvedValue(null);
      playlistRepository.isTrackInFavoritesPlaylist.mockResolvedValue(true);

      const result = await service.resolveForTrack(userId, trackId);

      expect(result).toEqual({ favorited: 'favorited', inLibrary: false });
    });

    it('returns inLibrary when track exists in library but is not favorited', async () => {
      libraryRepository.getByUserId.mockResolvedValue({ id: 'lib-1' } as never);
      libraryTrackRepository.getByLibraryAndTrack.mockResolvedValue({ id: 'lt-1' } as never);
      playlistRepository.isTrackInFavoritesPlaylist.mockResolvedValue(false);

      const result = await service.resolveForTrack(userId, trackId);

      expect(result).toEqual({ favorited: 'not-set', inLibrary: true });
    });

    it('returns favorited and inLibrary when track is in library and favorites', async () => {
      libraryRepository.getByUserId.mockResolvedValue({ id: 'lib-1' } as never);
      libraryTrackRepository.getByLibraryAndTrack.mockResolvedValue({ id: 'lt-1' } as never);
      playlistRepository.isTrackInFavoritesPlaylist.mockResolvedValue(true);

      const result = await service.resolveForTrack(userId, trackId);

      expect(result).toEqual({ favorited: 'favorited', inLibrary: true });
    });
  });
});
