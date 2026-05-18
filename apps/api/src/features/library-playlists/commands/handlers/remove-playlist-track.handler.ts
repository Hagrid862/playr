import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PlaylistRepository } from '@/shared/repositories/playlist.repository';
import { NotFoundException, PreconditionFailedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RemovePlaylistTrackResponse } from '@repo/contracts';
import { RemovePlaylistTrackCommand } from '../impl/remove-playlist-track.command';

@CommandHandler(RemovePlaylistTrackCommand)
export class RemovePlaylistTrackHandler implements ICommandHandler<RemovePlaylistTrackCommand> {
  constructor(
    private readonly libraryRepository: LibraryRepository,
    private readonly playlistRepository: PlaylistRepository,
  ) {}

  async execute(command: RemovePlaylistTrackCommand): Promise<RemovePlaylistTrackResponse['data']> {
    const { playlistId, trackId, userId } = command;
    const library = await this.libraryRepository.getByUserId(userId);
    if (!library) {
      throw new PreconditionFailedException(`User library not found for userId: ${userId}`);
    }

    const playlist = await this.playlistRepository.findActiveLibraryPlaylist(playlistId, library.id);
    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    await this.playlistRepository.removeTrackFromPlaylist(playlistId, trackId);
    return { ok: true as const };
  }
}
