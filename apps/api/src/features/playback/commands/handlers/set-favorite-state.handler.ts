import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PlaybackState } from '@repo/contracts';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { LibraryTrackRepository } from '@/shared/repositories/library-track.repository';
import { PlaylistRepository } from '@/shared/repositories/playlist.repository';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { requirePlaybackMutationExpectedVersion } from '../../utils/playback-mutation-guards';
import { SetFavoriteStateCommand } from '../impl/set-favorite-state.command';

@CommandHandler(SetFavoriteStateCommand)
export class SetFavoriteStateHandler implements ICommandHandler<SetFavoriteStateCommand> {
  constructor(
    private readonly persistence: PlaybackStatePersistenceService,
    private readonly libraryRepository: LibraryRepository,
    private readonly libraryTrackRepository: LibraryTrackRepository,
    private readonly playlistRepository: PlaylistRepository,
  ) {}

  async execute(command: SetFavoriteStateCommand): Promise<PlaybackState> {
    const { favorite, expectedVersion } = command.request;

    requirePlaybackMutationExpectedVersion(expectedVersion);

    return this.persistence.applyMutation(command.userId, expectedVersion, async (current) => {
      const trackId = current.trackData.trackId;
      const library = await this.libraryRepository.getByUserId(command.userId);

      if (favorite === 'favorited') {
        if (!library) {
          throw new BadRequestException('Library not found');
        }
        const link = await this.libraryTrackRepository.getByLibraryAndTrack(library.id, trackId);
        if (!link) {
          throw new BadRequestException('Track must be in your library to favorite');
        }
        await this.playlistRepository.setFavoritesMembership(library.id, trackId, true);
      } else if (favorite === 'not-set') {
        if (library) {
          await this.playlistRepository.setFavoritesMembership(library.id, trackId, false);
        }
      }

      return {
        ...current,
        favorited: favorite,
      };
    });
  }
}
