import { AlbumRepository } from '@/shared/repositories/album.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AlbumSchema, ZodAlbum } from '@repo/contracts';
import { AlbumSystemKind } from '@repo/db';
import { DeleteLibraryAlbumCommand } from '../impl/delete-library-album.command';

@CommandHandler(DeleteLibraryAlbumCommand)
export class DeleteLibraryAlbumHandler implements ICommandHandler<DeleteLibraryAlbumCommand> {
  constructor(
    private readonly albumRepository: AlbumRepository,
    private readonly libraryRepository: LibraryRepository,
  ) {}

  async execute(command: DeleteLibraryAlbumCommand): Promise<ZodAlbum> {
    const { id, userId, keepTracks } = command;

    const album = await this.albumRepository.getByIdForAlbumOwner(id, userId);

    if (!album) {
      throw new NotFoundException('Album not found or you do not have permission to delete it');
    }

    if (keepTracks && album.systemKind === AlbumSystemKind.unknown_bucket) {
      throw new BadRequestException(
        'Cannot delete the Unknown album while keeping its tracks. Turn off "Keep tracks" or delete tracks individually.',
      );
    }

    let deletedAlbum;
    if (keepTracks) {
      const library = await this.libraryRepository.getByUserId(userId);
      if (!library) {
        throw new PreconditionFailedException(`User library not found for userId: ${userId}`);
      }
      deletedAlbum = await this.albumRepository.softDeleteAlbumReassignTracksToUnknownBucket({
        userId,
        libraryId: library.id,
        sourceAlbumId: id,
      });
    } else {
      deletedAlbum = await this.albumRepository.softDeleteCascade(id);
    }

    const parsed = AlbumSchema.safeParse(deletedAlbum);

    if (!parsed.success) {
      throw new InternalServerErrorException('Failed to parse deleted album');
    }

    return parsed.data;
  }
}
