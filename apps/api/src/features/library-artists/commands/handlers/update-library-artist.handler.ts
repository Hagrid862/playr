import { ArtistRepository } from '@/shared/repositories/artist.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ArtistSchema, ZodArtist } from '@repo/contracts';
import { UpdateLibraryArtistCommand } from '../impl/update-library-artist.command';
import { GenreResolutionService } from '@/shared/genres/genre-resolution.service';

@CommandHandler(UpdateLibraryArtistCommand)
export class UpdateLibraryArtistHandler implements ICommandHandler<UpdateLibraryArtistCommand> {
  constructor(
    private readonly artistRepository: ArtistRepository,
    private readonly libraryRepository: LibraryRepository,
    private readonly genreResolutionService: GenreResolutionService,
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
      const library = await this.libraryRepository.findOne({ userId });
      if (!library) {
        throw new PreconditionFailedException('User library not found');
      }

      await this.genreResolutionService.assertGenreIdsAssignableToLibrary(library.id, request.genreIds);
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
