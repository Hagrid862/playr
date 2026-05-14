import { AlbumRepository } from '@/shared/repositories/album.repository';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AlbumSchema, ZodAlbum } from '@repo/contracts';
import { DeleteLibraryAlbumCommand } from '../impl/delete-library-album.command';

@CommandHandler(DeleteLibraryAlbumCommand)
export class DeleteLibraryAlbumHandler implements ICommandHandler<DeleteLibraryAlbumCommand> {
  constructor(private readonly albumRepository: AlbumRepository) {}

  async execute(command: DeleteLibraryAlbumCommand): Promise<ZodAlbum> {
    const { id, userId } = command;

    const album = await this.albumRepository.getByIdForAlbumOwner(id, userId);

    if (!album) {
      throw new NotFoundException('Album not found or you do not have permission to delete it');
    }

    const deletedAlbum = await this.albumRepository.softDelete(id);

    const parsed = AlbumSchema.safeParse(deletedAlbum);

    if (!parsed.success) {
      throw new InternalServerErrorException('Failed to parse deleted album');
    }

    return parsed.data;
  }
}
