import { ArtistRepository } from '@/shared/repositories/artist.repository';
import { GenreRepository } from '@/shared/repositories/genre.repository';
import { LibraryArtistRepository } from '@/shared/repositories/library-artist.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { UnitOfWorkService } from '@/shared/services/unit-of-work.service';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  PreconditionFailedException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ArtistSchema, ZodArtist } from '@repo/contracts';
import { CreateLibraryArtistCommand } from '../impl/create-library-artist.command';

@CommandHandler(CreateLibraryArtistCommand)
export class CreateLibraryArtistHandler implements ICommandHandler<CreateLibraryArtistCommand> {
  constructor(
    private readonly unitOfWork: UnitOfWorkService,
    private readonly artistRepository: ArtistRepository,
    private readonly libraryRepository: LibraryRepository,
    private readonly libraryArtistRepository: LibraryArtistRepository,
    private readonly genreRepository: GenreRepository,
  ) {}

  async execute(command: CreateLibraryArtistCommand): Promise<ZodArtist> {
    const { request, userId } = command;

    const library = await this.libraryRepository.getByUserId(userId);

    if (!library) {
      throw new PreconditionFailedException('User library not found');
    }

    const uniqueGenreIds =
      request.genreIds !== undefined ? [...new Set(request.genreIds)] : undefined;

    if (uniqueGenreIds !== undefined) {
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

    const artist = await this.unitOfWork.runInTransaction(async () => {
      const existingArtist = await this.artistRepository.getByNameForOwner(request.name, userId);

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
