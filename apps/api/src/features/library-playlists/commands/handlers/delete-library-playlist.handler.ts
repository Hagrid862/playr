import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PlaylistRepository } from '@/shared/repositories/playlist.repository';
import {
  BadRequestException,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteLibraryPlaylistResponse } from '@repo/contracts';
import { PlaylistSystemRole } from '@repo/db';
import { DeleteLibraryPlaylistCommand } from '../impl/delete-library-playlist.command';

@CommandHandler(DeleteLibraryPlaylistCommand)
export class DeleteLibraryPlaylistHandler implements ICommandHandler<DeleteLibraryPlaylistCommand> {
  constructor(
    private readonly libraryRepository: LibraryRepository,
    private readonly playlistRepository: PlaylistRepository,
  ) {}

  async execute(
    command: DeleteLibraryPlaylistCommand,
  ): Promise<DeleteLibraryPlaylistResponse['data']> {
    const { playlistId, userId } = command;
    const library = await this.libraryRepository.getByUserId(userId);
    if (!library) {
      throw new PreconditionFailedException(`User library not found for userId: ${userId}`);
    }

    const playlist = await this.playlistRepository.findActiveLibraryPlaylist(playlistId, library.id);
    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    if (playlist.systemRole === PlaylistSystemRole.favorites) {
      throw new BadRequestException('Cannot delete the favorites playlist');
    }

    await this.playlistRepository.softDeletePlaylist(playlistId);
    return { id: playlistId };
  }
}
