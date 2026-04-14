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

    const track = await this.trackRepository.findOne({
      id,
      access: { some: { userId, role: 'owner' } },
    });

    if (!track) {
      throw new NotFoundException('Track not found or you do not have permission to update it');
    }

    const library = await this.libraryRepository.getByUserId(userId);
    if (!library) {
      throw new PreconditionFailedException('User library not found');
    }

    if (body.genreIds !== undefined) {
      const assignable = await this.genreRepository.areGenreIdsAssignableToLibrary(
        library.id,
        body.genreIds,
      );
      if (!assignable) {
        throw new BadRequestException(
          'One or more genres are invalid or not available to your library',
        );
      }
    }

    const uniqueGenreIds =
      body.genreIds !== undefined ? [...new Set(body.genreIds)] : undefined;

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
                create: (uniqueGenreIds ?? []).map((genreId) => ({
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
