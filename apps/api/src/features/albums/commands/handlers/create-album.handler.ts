import { AlbumRepository } from '@/shared/repositories/album.repository';
import { LibraryAlbumRepository } from '@/shared/repositories/library-album.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PrivateProfileRepository } from '@/shared/repositories/private-profile.repository';
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
    private readonly privateProfileRepository: PrivateProfileRepository,
  ) {}

  async execute(command: CreateAlbumCommand): Promise<ZodAlbum> {
    const { request, userId } = command;

    const [userPrivateProfile, library] = await Promise.all([
      this.privateProfileRepository.getByUserId(userId),
      this.libraryRepository.getByUserId(userId),
    ]);

    if (!userPrivateProfile) {
      throw new PreconditionFailedException('User private profile not found');
    }

    if (!library) {
      throw new PreconditionFailedException('User library not found');
    }

    const album = await this.unitOfWork.runInTransaction(async () => {
      const existingAlbum = await this.albumRepository.getByNameAndOwnerId(
        request.name,
        userPrivateProfile.id,
      );

      if (existingAlbum) {
        throw new ConflictException('This album name is already taken');
      }

      const created = await this.albumRepository.create({
        name: request.name,
        description: request.description,
        type: request.type,
        releaseDate: request.releaseDate,
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
