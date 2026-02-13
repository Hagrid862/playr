import { AlbumRepository } from '@/shared/repositories/album.repository';
import { ImageService } from '@/shared/services/image.service';
import { PrismaService } from '@/shared/services/prisma.service';
import { StorageService } from '@/shared/services/storage.service';
import {
  BadRequestException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ImageSchema, ZodImage } from '@repo/contracts';
import { FileBucket } from '@repo/db';
import { UploadLibraryAlbumCoverCommand } from '../impl/upload-library-album-cover.command';

@CommandHandler(UploadLibraryAlbumCoverCommand)
export class UploadLibraryAlbumCoverHandler implements ICommandHandler<UploadLibraryAlbumCoverCommand> {
  private readonly logger = new Logger(UploadLibraryAlbumCoverHandler.name);

  constructor(
    private readonly albumRepository: AlbumRepository,
    private readonly storageService: StorageService,
    private readonly imageService: ImageService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: UploadLibraryAlbumCoverCommand): Promise<ZodImage> {
    const { albumId, file, userId } = command;

    // Validate album existence and ownership
    const album = await this.albumRepository.findOne({
      id: albumId,
      access: { some: { userId, role: 'OWNER' } },
    });

    if (!album) {
      throw new NotFoundException('Album not found or permission denied');
    }

    // Validate image
    const isValid = await this.imageService.validateImage(file);
    if (!isValid) {
      throw new BadRequestException('Invalid image or image too large');
    }

    // Fetch old cover details if it exists
    const oldCoverId = album.coverId;
    let oldImageDetails: { bucket: FileBucket; key: string } | null = null;
    if (oldCoverId) {
      const oldImage = await this.prisma.client.image.findUnique({
        where: { id: oldCoverId },
        select: { bucket: true, key: true },
      });
      if (oldImage) {
        oldImageDetails = { bucket: oldImage.bucket as FileBucket, key: oldImage.key };
      }
    }

    // Process image (resize to max 1024px for cover)
    const processedBuffer = await this.imageService.resizeToMaxDimension(file, 1024, 80, 'webp');
    const newMimeType = 'image/webp';
    const key = `albums/${albumId}/cover-${Date.now()}.webp`;

    // Upload to storage
    const { url } = await this.storageService.uploadFile(processedBuffer, FileBucket.public, key, {
      contentType: newMimeType,
    });

    try {
      // Database update (in a transaction)
      const result = await this.prisma.mainClient.$transaction(async (tx) => {
        // Create Image record
        const imageRecord = await tx.image.create({
          data: {
            bucket: FileBucket.public,
            key,
            url,
            mimeType: newMimeType,
            uploadStatus: 'uploaded',
          },
        });

        // Update Album with new coverId
        await tx.album.update({
          where: { id: albumId },
          data: { coverId: imageRecord.id },
        });

        // Cleanup old cover record from DB
        if (oldCoverId) {
          await tx.image.delete({
            where: { id: oldCoverId },
          });
        }

        const parsed = ImageSchema.safeParse(imageRecord);
        if (!parsed.success) {
          throw new InternalServerErrorException('Failed to parse uploaded image record');
        }

        return parsed.data;
      });

      // Cleanup old cover from S3 after successful transaction
      if (oldImageDetails) {
        this.storageService.deleteFile(oldImageDetails.bucket, oldImageDetails.key).catch((err) => {
          this.logger.error(`Failed to cleanup old cover file: ${oldImageDetails?.key}`, err);
        });
      }

      return result;
    } catch (error) {
      // Cleanup the NEWLY uploaded file if the transaction fails
      this.storageService.deleteFile(FileBucket.public, key).catch((err) => {
        this.logger.error(
          `Failed to cleanup new cover file after transaction failure: ${key}`,
          err,
        );
      });
      throw error;
    }
  }
}
