import { GenreRepository } from '@/shared/repositories/genre.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { TrackRepository } from '@/shared/repositories/track.repository';
import { UnitOfWorkService } from '@/shared/services/unit-of-work.service';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { TrackSchema, ZodTrack } from '@repo/contracts';
import { UpdateLibraryTrackCommand } from '../impl/update-library-track.command';

@CommandHandler(UpdateLibraryTrackCommand)
export class UpdateLibraryTrackHandler implements ICommandHandler<UpdateLibraryTrackCommand> {
  constructor(
    private readonly unitOfWork: UnitOfWorkService,
    private readonly trackRepository: TrackRepository,
    private readonly libraryRepository: LibraryRepository,
    private readonly genreRepository: GenreRepository,
  ) {}

  async execute(command: UpdateLibraryTrackCommand): Promise<ZodTrack> {
    const { id, body, userId } = command;

    const track = await this.trackRepository.getByIdForOwner(id, userId);

    if (!track) {
      throw new NotFoundException('Track not found or you do not have permission to update it');
    }

    let uniqueGenreIds: string[] | undefined;
    if (body.genreIds !== undefined) {
      uniqueGenreIds = [...new Set(body.genreIds)];
      const library = await this.libraryRepository.getByUserId(userId);
      if (!library) {
        throw new PreconditionFailedException('User library not found');
      }
      const assignable = await this.genreRepository.areGenreIdsAssignableToLibrary(
        library.id,
        uniqueGenreIds,
      );
      if (!assignable) {
        throw new BadRequestException(
          'One or more genres are invalid or not available to your library',
        );
      }
    }

    const updated = await this.unitOfWork.runInTransaction(async () => {
      return await this.trackRepository.update(id, {
        title: body.title,
        trackNumber: body.trackNumber,
        diskNumber: body.diskNumber,
        duration: body.duration,
        explicit: body.explicit,
        lyrics: body.lyrics,
        visibility: body.visibility,
        artists: body.artistIds
          ? {
              set: body.artistIds.map((artistId) => ({ id: artistId })),
            }
          : undefined,
        ...(body.genreIds !== undefined
          ? {
              genres: {
                deleteMany: {},
                create: [...new Set(body.genreIds)].map((genreId) => ({
                  genre: { connect: { id: genreId } },
                })),
              },
            }
          : {}),
      });
    });

    const parsed = TrackSchema.safeParse(updated);

    if (!parsed.success) {
      throw new InternalServerErrorException('Failed to parse track');
    }

    return parsed.data;
  }
}
