import { AlbumRepository } from '@/shared/repositories/album.repository';
import { GenreRepository } from '@/shared/repositories/genre.repository';
import { LibraryTrackRepository } from '@/shared/repositories/library-track.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { TrackRepository } from '@/shared/repositories/track.repository';
import { UnitOfWorkService } from '@/shared/services/unit-of-work.service';
import {
  BadRequestException,
  InternalServerErrorException,
  PreconditionFailedException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TrackSchema, ZodTrack } from '@repo/contracts';
import { Visibility } from '@repo/db';
import { BulkCreateLibraryTracksCommand } from '../impl/bulk-create-library-tracks.command';

@CommandHandler(BulkCreateLibraryTracksCommand)
export class BulkCreateLibraryTracksHandler implements ICommandHandler<BulkCreateLibraryTracksCommand> {
  constructor(
    private readonly unitOfWork: UnitOfWorkService,
    private readonly libraryRepository: LibraryRepository,
    private readonly albumRepository: AlbumRepository,
    private readonly trackRepository: TrackRepository,
    private readonly libraryTrackRepository: LibraryTrackRepository,
    private readonly genreRepository: GenreRepository,
  ) {}

  async execute(command: BulkCreateLibraryTracksCommand): Promise<{ tracks: ZodTrack[] }> {
    const { albumId, body, userId } = command;

    const library = await this.libraryRepository.getByUserId(userId);

    if (!library) {
      throw new PreconditionFailedException('User library not found');
    }

    const album = await this.albumRepository.findOne({ id: albumId });
    if (!album) {
      throw new PreconditionFailedException('Album not found');
    }

    const allGenreIds = body.tracks.flatMap((t) => t.genreIds ?? []);
    if (allGenreIds.length > 0) {
      const assignable = await this.genreRepository.areGenreIdsAssignableToLibrary(
        library.id,
        allGenreIds,
      );
      if (!assignable) {
        throw new BadRequestException(
          'One or more genres are invalid or not available to your library',
        );
      }
    }

    const tracks = await this.unitOfWork.runInTransaction(async () => {
      const created: ZodTrack[] = [];

      for (const item of body.tracks) {
        const uniqueGenreIds =
          item.genreIds !== undefined ? [...new Set(item.genreIds)] : undefined;

        const track = await this.trackRepository.create({
          title: item.title,
          trackNumber: item.trackNumber,
          diskNumber: item.diskNumber,
          duration: 0, // will be calculated from the audio file
          explicit: item.explicit,
          visibility: Visibility.private,
          album: { connect: { id: albumId } },
          artists: { connect: item.artistIds.map((id) => ({ id })) },
          access: {
            create: {
              userId: userId,
              role: 'owner',
            },
          },
          ...(uniqueGenreIds && uniqueGenreIds.length > 0
            ? {
                genres: {
                  create: uniqueGenreIds.map((genreId) => ({
                    genre: { connect: { id: genreId } },
                  })),
                },
              }
            : {}),
        });

        await this.libraryTrackRepository.create({
          track: { connect: { id: track.id } },
          library: { connect: { id: library.id } },
        });

        const parsed = TrackSchema.safeParse(track);
        if (!parsed.success) {
          console.error(parsed.error);
          throw new InternalServerErrorException('Failed to parse track');
        }
        created.push(parsed.data);
      }

      return created;
    });

    return { tracks };
  }
}
