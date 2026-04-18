import { ArtistRepository } from '@/shared/repositories/artist.repository';
import { GenreRepository } from '@/shared/repositories/genre.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ArtistSchema, ZodArtist } from '@repo/contracts';
import { UpdateLibraryArtistCommand } from '../impl/update-library-artist.command';

@CommandHandler(UpdateLibraryArtistCommand)
export class UpdateLibraryArtistHandler implements ICommandHandler<UpdateLibraryArtistCommand> {
  constructor(
    private readonly artistRepository: ArtistRepository,
    private readonly libraryRepository: LibraryRepository,
    private readonly genreRepository: GenreRepository,
  ) {}

  async execute(command: UpdateLibraryArtistCommand): Promise<ZodArtist> {
    const { artistId, request, userId } = command;

    const artist = await this.artistRepository.findOne({
      id: artistId,
      access: { some: { userId, role: 'owner' } },
    });

    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    if (request.name && request.name !== artist.name) {
      const existingArtistWithName = await this.artistRepository.findOne({
        name: request.name,
        access: { some: { userId, role: 'owner' } },
      });

      if (existingArtistWithName) {
        throw new ConflictException('This artist name is already taken');
      }
    }

    if (request.genreIds !== undefined) {
      const library = await this.libraryRepository.getByUserId(userId);
      if (!library) {
        throw new PreconditionFailedException('User library not found');
      }

      const assignable = await this.genreRepository.areGenreIdsAssignableToLibrary(
        library.id,
        request.genreIds,
      );
      if (!assignable) {
        throw new BadRequestException(
          'One or more genres are invalid or not available to your library',
        );
      }
    }

    const updatedArtist = await this.artistRepository.update(artistId, {
      name: request.name,
      description: request.description,
      ...(request.genreIds !== undefined
        ? {
            genres: {
              deleteMany: {},
              create: [...new Set(request.genreIds)].map((genreId) => ({
                genre: { connect: { id: genreId } },
              })),
            },
          }
        : {}),
    });

    const parsed = ArtistSchema.safeParse(updatedArtist);

    if (!parsed.success) {
      throw new InternalServerErrorException('Failed to parse updated artist');
    }

    return parsed.data;
  }
}
