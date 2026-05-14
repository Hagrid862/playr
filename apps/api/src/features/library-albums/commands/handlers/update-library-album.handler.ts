import { AlbumRepository } from '@/shared/repositories/album.repository';
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
  ) {}

  async execute(command: UpdateLibraryAlbumCommand): Promise<ZodAlbum> {
    const { id, request, userId } = command;

    const album = await this.albumRepository.findOne({
      id,
      OR: [
        { access: { some: { userId, role: 'owner' } } },
        { artists: { some: { access: { some: { userId, role: 'owner' } } } } },
      ],
    });

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

    if (request.name && request.name !== album.name) {
      const existingAlbumWithName = await this.albumRepository.findOne({
        name: request.name,
        OR: [
          { access: { some: { userId, role: 'owner' } } },
          { artists: { some: { access: { some: { userId, role: 'owner' } } } } },
        ],
      });

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
    });

    const parsed = AlbumSchema.safeParse(updated);

    if (!parsed.success) {
      throw new InternalServerErrorException('Failed to parse updated album');
    }

    return parsed.data;
  }
}
