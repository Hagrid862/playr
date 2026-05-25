import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PlaylistRepository } from '@/shared/repositories/playlist.repository';
import { PrismaService } from '@/shared/services/prisma.service';
import { StorageService } from '@/shared/services/storage.service';
import {
  BadRequestException,
  Logger,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { DeleteLibraryPlaylistCoverResponse } from '@repo/contracts';
import { FileBucket, PlaylistSystemRole } from '@repo/db';
import { DeleteLibraryPlaylistCoverCommand } from '../impl/delete-library-playlist-cover.command';

@CommandHandler(DeleteLibraryPlaylistCoverCommand)
export class DeleteLibraryPlaylistCoverHandler implements ICommandHandler<
  DeleteLibraryPlaylistCoverCommand,
  DeleteLibraryPlaylistCoverResponse['data']
> {
  private readonly logger = new Logger(DeleteLibraryPlaylistCoverHandler.name);

  constructor(
    private readonly libraryRepository: LibraryRepository,
    private readonly playlistRepository: PlaylistRepository,
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async execute(
    command: DeleteLibraryPlaylistCoverCommand,
  ): Promise<DeleteLibraryPlaylistCoverResponse['data']> {
    const { playlistId, userId } = command;

    const library = await this.libraryRepository.getByUserId(userId);
    if (!library) {
      throw new PreconditionFailedException(`User library not found for userId: ${userId}`);
    }

    const playlist = await this.playlistRepository.findActiveLibraryPlaylist(
      playlistId,
      library.id,
    );
    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    if (playlist.systemRole === PlaylistSystemRole.favorites) {
      throw new BadRequestException('Cannot change cover for the favorites playlist');
    }

    if (!playlist.coverId) {
      return { id: playlistId, cover: undefined };
    }

    const coverId = playlist.coverId;
    const image = await this.prisma.client.image.findUnique({
      where: { id: coverId },
      select: { bucket: true, key: true },
    });

    await this.prisma.mainClient.$transaction(async (tx) => {
      await tx.playlist.update({
        where: { id: playlistId },
        data: { coverId: null },
      });
      if (image) {
        await tx.image.delete({
          where: { id: coverId },
        });
      }
    });

    if (image) {
      this.storageService.deleteFile(image.bucket as FileBucket, image.key).catch((err) => {
        this.logger.error(`Failed to cleanup playlist cover file from S3: ${image.key}`, err);
      });
    }

    return { id: playlistId, cover: undefined };
  }
}
