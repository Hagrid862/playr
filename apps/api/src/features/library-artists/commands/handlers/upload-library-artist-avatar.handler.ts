import { ArtistRepository } from '@/shared/repositories/artist.repository';
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
import { UploadLibraryArtistAvatarCommand } from '../impl/upload-library-artist-avatar.command';

@CommandHandler(UploadLibraryArtistAvatarCommand)
export class UploadLibraryArtistAvatarHandler implements ICommandHandler<UploadLibraryArtistAvatarCommand> {
  private readonly logger = new Logger(UploadLibraryArtistAvatarHandler.name);

  constructor(
    private readonly artistRepository: ArtistRepository,
    private readonly storageService: StorageService,
    private readonly imageService: ImageService,
    private readonly prisma: PrismaService,
  ) { }

  async execute(command: UploadLibraryArtistAvatarCommand): Promise<ZodImage> {
    const { artistId, file, userId } = command;

    // Validate artist existence and ownership
    const artist = await this.artistRepository.findOne({
      id: artistId,
      access: { some: { userId, role: 'owner' } },
    });
    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    // Validate image
    const isValid = await this.imageService.validateImage(file, 50);
    if (!isValid) {
      throw new BadRequestException('Invalid image or image too large');
    }

    // Fetch old avatar details if it exists
    const oldAvatarId = artist.avatarId;
    let oldImageDetails: { bucket: FileBucket; key: string } | null = null;
    if (oldAvatarId) {
      const oldImage = await this.prisma.client.image.findUnique({
        where: { id: oldAvatarId },
        select: { bucket: true, key: true },
      });
      if (oldImage) {
        oldImageDetails = { bucket: oldImage.bucket as FileBucket, key: oldImage.key };
      }
    }

    // Process image (resize to max 1024px for avatar)
    const processedBuffer = await this.imageService.resizeToMaxDimension(file, 1024, 80, 'webp');
    const newMimeType = 'image/webp';
    const key = `artists/${artistId}/avatar-${Date.now()}.webp`;

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

        // Update Artist with new avatarId
        await tx.artist.update({
          where: { id: artistId },
          data: { avatarId: imageRecord.id },
        });

        // Cleanup old avatar record from DB
        if (oldAvatarId) {
          await tx.image.delete({
            where: { id: oldAvatarId },
          });
        }

        const parsed = ImageSchema.safeParse(imageRecord);
        if (!parsed.success) {
          throw new InternalServerErrorException('Failed to parse uploaded image record');
        }

        return parsed.data;
      });

      // Cleanup old avatar from S3 after successful transaction
      if (oldImageDetails) {
        this.storageService.deleteFile(oldImageDetails.bucket, oldImageDetails.key).catch((err) => {
          this.logger.error(`Failed to cleanup old avatar file: ${oldImageDetails?.key}`, err);
        });
      }

      return result;
    } catch (error) {
      // Cleanup the NEWLY uploaded file if the transaction fails
      this.storageService.deleteFile(FileBucket.public, key).catch((err) => {
        this.logger.error(
          `Failed to cleanup new avatar file after transaction failure: ${key}`,
          err,
        );
      });
      throw error;
    }
  }
}
