import { AlbumRepository } from '@/shared/repositories/album.repository';
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
import { AlbumSchema, ZodAlbum } from '@repo/contracts';
import { UpdateLibraryAlbumCommand } from '../impl/update-library-album.command';

@CommandHandler(UpdateLibraryAlbumCommand)
export class UpdateLibraryAlbumHandler implements ICommandHandler<UpdateLibraryAlbumCommand> {
  constructor(
    private readonly albumRepository: AlbumRepository,
    private readonly libraryRepository: LibraryRepository,
    private readonly genreRepository: GenreRepository,
    private readonly artistRepository: ArtistRepository,
  ) {}

  async execute(command: UpdateLibraryAlbumCommand): Promise<ZodAlbum> {
    const { id, request, userId } = command;

    const album = await this.albumRepository.getByIdForOwner(id, userId);

    if (!album) {
      throw new NotFoundException('Album not found');
    }

    let uniqueGenreIds: string[] | undefined;
    if (request.genreIds !== undefined) {
      uniqueGenreIds = [...new Set(request.genreIds)];
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

    let uniqueArtistIds: string[] | undefined;
    if (request.artistIds !== undefined) {
      uniqueArtistIds = [...new Set(request.artistIds)];
      const owned = await this.artistRepository.countActiveOwnedByUser(uniqueArtistIds, userId);
      if (owned !== uniqueArtistIds.length) {
        throw new BadRequestException(
          'One or more artists are invalid or not available to your library',
        );
      }
    }

    if (request.name && request.name !== album.name) {
      const existingAlbumWithName = await this.albumRepository.getByNameForOwner(
        request.name,
        userId,
      );

      if (existingAlbumWithName) {
        throw new ConflictException('This album name is already taken');
      }
    }

    const updated = await this.albumRepository.update(id, {
      name: request.name,
      description: request.description,
      type: request.type,
      releaseDate: request.releaseDate,
      cover:
        request.coverId === null
          ? { disconnect: true }
          : request.coverId
            ? { connect: { id: request.coverId } }
            : undefined,
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
      ...(request.artistIds !== undefined
        ? {
            artists: {
              set: [...new Set(request.artistIds)].map((artistId) => ({ id: artistId })),
            },
          }
        : {}),
    });

    const parsed = AlbumSchema.safeParse(updated);

    if (!parsed.success) {
      throw new InternalServerErrorException('Failed to parse updated album');
    }

    return parsed.data;
  }
}
