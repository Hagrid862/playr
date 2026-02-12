import { AlbumRepository } from '@/shared/repositories/album.repository';
import { PrivateProfileRepository } from '@/shared/repositories/private-profile.repository';
import {
    ConflictException,
    InternalServerErrorException,
    NotFoundException,
    PreconditionFailedException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AlbumSchema, ZodAlbum } from '@repo/contracts';
import { UpdateAlbumCommand } from '../impl/update-album.command';

@CommandHandler(UpdateAlbumCommand)
export class UpdateAlbumHandler implements ICommandHandler<UpdateAlbumCommand> {
  constructor(
    private readonly albumRepository: AlbumRepository,
    private readonly privateProfileRepository: PrivateProfileRepository,
  ) {}

  async execute(command: UpdateAlbumCommand): Promise<ZodAlbum> {
    const { id, request, userId } = command;

    const userPrivateProfile = await this.privateProfileRepository.getByUserId(userId);

    if (!userPrivateProfile) {
      throw new PreconditionFailedException('User private profile not found');
    }

    const album = await this.albumRepository.getByIdAndOwnerId(id, userPrivateProfile.id);

    if (!album) {
      throw new NotFoundException('Album not found');
    }

    if (request.name && request.name !== album.name) {
      const existingAlbumWithName = await this.albumRepository.getByNameAndOwnerId(
        request.name,
        userPrivateProfile.id,
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
    });

    const parsed = AlbumSchema.safeParse(updated);

    if (!parsed.success) {
      throw new InternalServerErrorException('Failed to parse updated album');
    }

    return parsed.data;
  }
}
