import { AlbumRepository } from '@/shared/repositories/album.repository';
import { LibraryAlbumRepository } from '@/shared/repositories/library-album.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { UnitOfWorkService } from '@/shared/services/unit-of-work.service';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  PreconditionFailedException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AlbumSchema, ZodAlbum } from '@repo/contracts';
import { CreateLibraryAlbumCommand } from '../impl/create-library-album.command';
import { GenreResolutionService } from '@/shared/genres/genre-resolution.service';

@CommandHandler(CreateLibraryAlbumCommand)
export class CreateLibraryAlbumHandler implements ICommandHandler<CreateLibraryAlbumCommand> {
  constructor(
    private readonly unitOfWork: UnitOfWorkService,
    private readonly libraryRepository: LibraryRepository,
    private readonly albumRepository: AlbumRepository,
    private readonly libraryAlbumRepository: LibraryAlbumRepository,
    private readonly genreResolutionService: GenreResolutionService,
  ) {}

  async execute(command: CreateLibraryAlbumCommand): Promise<ZodAlbum> {
    const { request, userId } = command;

    const library = await this.libraryRepository.findOne({ userId });

    if (!library) {
      throw new PreconditionFailedException('User library not found');
    }

    const uniqueGenreIds =
      request.genreIds !== undefined ? [...new Set(request.genreIds)] : undefined;

    if (uniqueGenreIds !== undefined) {
      const assignable = await this.genreResolutionService.assertGenreIdsAssignableToLibrary(
        library.id,
        uniqueGenreIds,
      );
      if (!assignable) {
        throw new BadRequestException(
          'One or more genres are invalid or not available to your library',
        );
      }
    }

    const album = await this.unitOfWork.runInTransaction(async () => {
      const existingAlbum = await this.albumRepository.findOneWithInclude(
        {
          name: request.name,
          OR: [
            { access: { some: { userId, role: 'owner' } } },
            { artists: { some: { access: { some: { userId, role: 'owner' } } } } },
          ],
        },
        { access: true, artists: true },
      );

      if (existingAlbum) {
        throw new ConflictException('This album name is already taken');
      }

      const created = await this.albumRepository.create({
        name: request.name,
        description: request.description,
        type: request.type,
        releaseDate: request.releaseDate,
        visibility: 'private',
        access: {
          create: {
            userId: userId,
            role: 'owner',
          },
        },
        artists: {
          connect: {
            id: request.artistId,
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

      await this.libraryAlbumRepository.create({
        album: { connect: { id: created.id } },
        library: { connect: { id: library.id } },
      });

      return created;
    });

    const parsed = AlbumSchema.safeParse(album);

    if (!parsed.success) {
      throw new InternalServerErrorException('Failed to parse album');
    }

    return parsed.data;
  }
}
