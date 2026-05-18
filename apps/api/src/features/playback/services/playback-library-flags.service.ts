import { Injectable } from '@nestjs/common';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { LibraryTrackRepository } from '@/shared/repositories/library-track.repository';
import { PlaylistRepository } from '@/shared/repositories/playlist.repository';

export type PlaybackFavoriteFlag = 'favorited' | 'not-set';

@Injectable()
export class PlaybackLibraryFlagsService {
  constructor(
    private readonly libraryRepository: LibraryRepository,
    private readonly libraryTrackRepository: LibraryTrackRepository,
    private readonly playlistRepository: PlaylistRepository,
  ) {}

  async resolveForTrack(
    userId: string,
    trackId: string,
  ): Promise<{ favorited: PlaybackFavoriteFlag; inLibrary: boolean }> {
    const library = await this.libraryRepository.getByUserId(userId);
    if (!library) {
      return { favorited: 'not-set', inLibrary: false };
    }

    const inLibrary = !!(await this.libraryTrackRepository.getByLibraryAndTrack(
      library.id,
      trackId,
    ));

    const favorited = (await this.playlistRepository.isTrackInFavoritesPlaylist(library.id, trackId))
      ? ('favorited' as const)
      : ('not-set' as const);

    return { favorited, inLibrary };
  }
}
