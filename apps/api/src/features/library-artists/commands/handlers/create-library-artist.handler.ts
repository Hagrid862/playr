import { ArtistRepository } from '@/shared/repositories/artist.repository';
import { LibraryArtistRepository } from '@/shared/repositories/library-artist.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { UnitOfWorkService } from '@/shared/services/unit-of-work.service';
import {
  ConflictException,
  InternalServerErrorException,
  PreconditionFailedException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ArtistSchema, ZodArtist } from '@repo/contracts';
import { CreateLibraryArtistCommand } from '../impl/create-library-artist.command';
import { GenreResolutionService } from '@/shared/genres/genre-resolution.service';

@CommandHandler(CreateLibraryArtistCommand)
export class CreateLibraryArtistHandler implements ICommandHandler<CreateLibraryArtistCommand> {
  constructor(
    private readonly unitOfWork: UnitOfWorkService,
    private readonly artistRepository: ArtistRepository,
    private readonly libraryRepository: LibraryRepository,
    private readonly libraryArtistRepository: LibraryArtistRepository,
    private readonly genreResolutionService: GenreResolutionService,
  ) {}

  async execute(command: CreateLibraryArtistCommand): Promise<ZodArtist> {
    const { request, userId } = command;

    const library = await this.libraryRepository.findOne({ userId });

    if (!library) {
      throw new PreconditionFailedException('User library not found');
    }

    const uniqueGenreIds =
      request.genreIds !== undefined ? [...new Set(request.genreIds)] : undefined;

    if (uniqueGenreIds !== undefined) {
      await this.genreResolutionService.assertGenreIdsAssignableToLibrary(
        library.id,
        uniqueGenreIds,
      );
    }

    const artist = await this.unitOfWork.runInTransaction(async () => {
      const existingArtist = await this.artistRepository.findOne({
        name: request.name,
        access: { some: { userId, role: 'owner' } },
      });

      if (existingArtist) {
        throw new ConflictException('This artist name is already taken');
      }

      const created = await this.artistRepository.create({
        name: request.name,
        description: request.description,
        visibility: 'private',
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

      await this.libraryArtistRepository.create({
        artist: { connect: { id: created.id } },
        library: { connect: { id: library.id } },
      });

      return created;
    });

    const parsed = ArtistSchema.safeParse(artist);

    if (!parsed.success) {
      throw new InternalServerErrorException('Failed to parse artist');
    }

    return parsed.data;
  }
}
