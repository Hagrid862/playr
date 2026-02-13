import { AlbumRepository } from '@/shared/repositories/album.repository';
import { LibraryAlbumRepository } from '@/shared/repositories/library-album.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { UnitOfWorkService } from '@/shared/services/unit-of-work.service';
import {
  ConflictException,
  InternalServerErrorException,
  PreconditionFailedException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AlbumSchema, ZodAlbum } from '@repo/contracts';
import { CreateAlbumCommand } from '../impl/create-album.command';

@CommandHandler(CreateAlbumCommand)
export class CreateAlbumHandler implements ICommandHandler<CreateAlbumCommand> {
  constructor(
    private readonly unitOfWork: UnitOfWorkService,
    private readonly libraryRepository: LibraryRepository,
    private readonly albumRepository: AlbumRepository,
    private readonly libraryAlbumRepository: LibraryAlbumRepository,
  ) {}

  async execute(command: CreateAlbumCommand): Promise<ZodAlbum> {
    const { request, userId } = command;

    const library = await this.libraryRepository.getByUserId(userId);

    if (!library) {
      throw new PreconditionFailedException('User library not found');
    }

    const album = await this.unitOfWork.runInTransaction(async () => {
      const existingAlbum = await this.albumRepository.findOne({
        name: request.name,
        OR: [
          { access: { some: { userId, role: 'OWNER' } } },
          { artists: { some: { access: { some: { userId, role: 'OWNER' } } } } },
        ],
      });

      if (existingAlbum) {
        throw new ConflictException('This album name is already taken');
      }

      const created = await this.albumRepository.create({
        name: request.name,
        description: request.description,
        type: request.type,
        releaseDate: request.releaseDate,
        visibility: 'PRIVATE',
        access: {
          create: {
            userId: userId,
            role: 'OWNER',
          },
        },
        artists: {
          connect: {
            id: request.artistId,
          },
        },
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
