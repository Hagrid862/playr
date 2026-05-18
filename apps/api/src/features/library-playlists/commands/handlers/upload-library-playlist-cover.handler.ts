import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PlaylistRepository } from '@/shared/repositories/playlist.repository';
import { ImageService } from '@/shared/services/image.service';
import { PrismaService } from '@/shared/services/prisma.service';
import { StorageService } from '@/shared/services/storage.service';
import {
  BadRequestException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ImageSchema, type ZodImage } from '@repo/contracts';
import { FileBucket, PlaylistSystemRole } from '@repo/db';
import { UploadLibraryPlaylistCoverCommand } from '../impl/upload-library-playlist-cover.command';

@CommandHandler(UploadLibraryPlaylistCoverCommand)
export class UploadLibraryPlaylistCoverHandler
  implements ICommandHandler<UploadLibraryPlaylistCoverCommand, ZodImage>
{
  private readonly logger = new Logger(UploadLibraryPlaylistCoverHandler.name);

  constructor(
    private readonly libraryRepository: LibraryRepository,
    private readonly playlistRepository: PlaylistRepository,
    private readonly storageService: StorageService,
    private readonly imageService: ImageService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: UploadLibraryPlaylistCoverCommand): Promise<ZodImage> {
    const { playlistId, file, userId } = command;

    const library = await this.libraryRepository.getByUserId(userId);
    if (!library) {
      throw new PreconditionFailedException(`User library not found for userId: ${userId}`);
    }

    const playlist = await this.playlistRepository.findActiveLibraryPlaylist(playlistId, library.id);
    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    if (playlist.systemRole === PlaylistSystemRole.favorites) {
      throw new BadRequestException('Cannot change cover for the favorites playlist');
    }

    const isValid = await this.imageService.validateImage(file, 50);
    if (!isValid) {
      throw new BadRequestException('Invalid image or image too large');
    }

    const oldCoverId = playlist.coverId;
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

    const processedBuffer = await this.imageService.resizeToMaxDimension(file, 1024, 80, 'webp');
    const newMimeType = 'image/webp';
    const key = `playlists/${playlistId}/cover-${Date.now()}.webp`;

    const { url } = await this.storageService.uploadFile(processedBuffer, FileBucket.public, key, {
      contentType: newMimeType,
    });

    try {
      const result = await this.prisma.mainClient.$transaction(async (tx) => {
        const imageRecord = await tx.image.create({
          data: {
            bucket: FileBucket.public,
            key,
            url,
            mimeType: newMimeType,
            uploadStatus: 'uploaded',
          },
        });

        await tx.playlist.update({
          where: { id: playlistId },
          data: { coverId: imageRecord.id },
        });

        if (oldCoverId) {
          await tx.image.deleteMany({ where: { id: oldCoverId } });
        }

        const parsed = ImageSchema.safeParse(imageRecord);
        if (!parsed.success) {
          throw new InternalServerErrorException('Failed to parse uploaded image record');
        }

        return parsed.data;
      });

      if (oldImageDetails) {
        this.storageService.deleteFile(oldImageDetails.bucket, oldImageDetails.key).catch((err) => {
          this.logger.error(`Failed to cleanup old playlist cover file: ${oldImageDetails?.key}`, err);
        });
      }

      return result;
    } catch (error) {
      this.storageService.deleteFile(FileBucket.public, key).catch((err) => {
        this.logger.error(
          `Failed to cleanup new playlist cover file after transaction failure: ${key}`,
          err,
        );
      });
      throw error;
    }
  }
}
