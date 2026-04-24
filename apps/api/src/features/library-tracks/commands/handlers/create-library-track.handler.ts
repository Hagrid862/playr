import { AlbumRepository } from '@/shared/repositories/album.repository';
import { LibraryTrackRepository } from '@/shared/repositories/library-track.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { TrackRepository } from '@/shared/repositories/track.repository';
import { UnitOfWorkService } from '@/shared/services/unit-of-work.service';
import { InternalServerErrorException, PreconditionFailedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TrackSchema, ZodTrack } from '@repo/contracts';
import { Visibility } from '@repo/db';
import { CreateLibraryTrackCommand } from '../impl/create-library-track.command';
import { GenreResolutionService } from '@/shared/genres/genre-resolution.service';

@CommandHandler(CreateLibraryTrackCommand)
export class CreateLibraryTrackHandler implements ICommandHandler<CreateLibraryTrackCommand> {
  constructor(
    private readonly unitOfWork: UnitOfWorkService,
    private readonly libraryRepository: LibraryRepository,
    private readonly albumRepository: AlbumRepository,
    private readonly trackRepository: TrackRepository,
    private readonly libraryTrackRepository: LibraryTrackRepository,
    private readonly genreResolutionService: GenreResolutionService,
  ) {}

  async execute(command: CreateLibraryTrackCommand): Promise<ZodTrack> {
    const { body, userId } = command;

    const library = await this.libraryRepository.findOne({ userId });

    if (!library) {
      throw new PreconditionFailedException('User library not found');
    }

    const album = await this.albumRepository.findOne({ id: body.albumId });
    if (!album) {
      throw new PreconditionFailedException('Album not found');
    }

    const uniqueGenreIds = body.genreIds !== undefined ? [...new Set(body.genreIds)] : undefined;

    if (uniqueGenreIds !== undefined) {
      await this.genreResolutionService.assertGenreIdsAssignableToLibrary(
        library.id,
        uniqueGenreIds,
      );
    }

    const track = await this.unitOfWork.runInTransaction(async () => {
      const created = await this.trackRepository.create({
        title: body.title,
        trackNumber: body.trackNumber,
        diskNumber: body.diskNumber,
        duration: 0, // will be later calculated from the audio file
        explicit: body.explicit,
        visibility: Visibility.private, // this route is used to create only private tracks
        album: {
          connect: {
            id: body.albumId,
          },
        },
        artists: {
          connect: body.artistIds.map((id) => ({ id })),
        },
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
        track: { connect: { id: created.id } },
        library: { connect: { id: library.id } },
      });

      return created;
    });

    const parsed = TrackSchema.safeParse(track);

    if (!parsed.success) {
      console.error(parsed.error);
      throw new InternalServerErrorException('Failed to parse track');
    }

    return parsed.data;
  }
}
