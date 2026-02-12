import { AlbumRepository } from '@/shared/repositories/album.repository';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AlbumSchema, ZodAlbum } from '@repo/contracts';
import { DeleteAlbumCommand } from '../impl/delete-album.command';

@CommandHandler(DeleteAlbumCommand)
export class DeleteAlbumHandler implements ICommandHandler<DeleteAlbumCommand> {
  constructor(private readonly albumRepository: AlbumRepository) {}

  async execute(command: DeleteAlbumCommand): Promise<ZodAlbum> {
    const { id, userId } = command;

    const album = await this.albumRepository.findOne({
      id,
      access: {
        some: {
          userId,
          role: 'OWNER',
        },
      },
    });

    if (!album) {
      throw new NotFoundException('Album not found or you do not have permission to delete it');
    }

    const deletedAlbum = await this.albumRepository.update(id, {
      deletedAt: new Date(),
    });

    const parsed = AlbumSchema.safeParse(deletedAlbum);

    if (!parsed.success) {
      throw new InternalServerErrorException('Failed to parse deleted album');
    }

    return parsed.data;
  }
}
