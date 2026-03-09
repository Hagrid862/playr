import { AlbumRepository } from '@/shared/repositories/album.repository';
import { ImageRepository } from '@/shared/repositories/image.repository';
import { StorageService } from '@/shared/services/storage.service';
import { UnitOfWorkService } from '@/shared/services/unit-of-work.service';
import { Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { FileBucket } from '@repo/db';
import { AlbumSchema, ZodAlbum } from '@repo/contracts';
import { DeleteLibraryAlbumCoverCommand } from '../impl/delete-library-album-cover.command';

@CommandHandler(DeleteLibraryAlbumCoverCommand)
export class DeleteLibraryAlbumCoverHandler implements ICommandHandler<
  DeleteLibraryAlbumCoverCommand,
  ZodAlbum
> {
  private readonly logger = new Logger(DeleteLibraryAlbumCoverHandler.name);

  constructor(
    private readonly albumRepository: AlbumRepository,
    private readonly imageRepository: ImageRepository,
    private readonly storageService: StorageService,
    private readonly unitOfWork: UnitOfWorkService,
  ) {}

  async execute(command: DeleteLibraryAlbumCoverCommand): Promise<ZodAlbum> {
    const { albumId, userId } = command;

    const album = await this.albumRepository.findOne({
      id: albumId,
      access: { some: { userId, role: 'owner' } },
    });

    if (!album) {
      throw new NotFoundException('Album not found or permission denied');
    }

    if (!album.coverId) {
      return album;
    }

    const coverId = album.coverId;

    const image = await this.imageRepository.findOne({ id: coverId });

    await this.unitOfWork.runInTransaction(async () => {
      await this.albumRepository.update(albumId, { cover: { disconnect: true } });
      await this.imageRepository.delete(coverId);
    });

    if (image) {
      this.storageService.deleteFile(image.bucket as FileBucket, image.key).catch((err) => {
        this.logger.error(`Failed to cleanup cover file from S3: ${image.key}`, err);
      });
    }

    const result = AlbumSchema.safeParse({ ...album, coverId: null, cover: null });
    if (!result.success) {
      throw new Error('Failed to parse updated album');
    }
    return result.data;
  }
}
