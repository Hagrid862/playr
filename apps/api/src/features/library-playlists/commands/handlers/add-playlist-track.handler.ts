import { LibraryRepository } from '@/shared/repositories/library.repository';
import { LibraryTrackRepository } from '@/shared/repositories/library-track.repository';
import { PlaylistRepository } from '@/shared/repositories/playlist.repository';
import { BadRequestException, NotFoundException, PreconditionFailedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AddPlaylistTrackResponse } from '@repo/contracts';
import { AddPlaylistTrackCommand } from '../impl/add-playlist-track.command';

@CommandHandler(AddPlaylistTrackCommand)
export class AddPlaylistTrackHandler implements ICommandHandler<AddPlaylistTrackCommand> {
  constructor(
    private readonly libraryRepository: LibraryRepository,
    private readonly playlistRepository: PlaylistRepository,
    private readonly libraryTrackRepository: LibraryTrackRepository,
  ) {}

  async execute(command: AddPlaylistTrackCommand): Promise<AddPlaylistTrackResponse['data']> {
    const { playlistId, body, userId } = command;
    const library = await this.libraryRepository.getByUserId(userId);
    if (!library) {
      throw new PreconditionFailedException(`User library not found for userId: ${userId}`);
    }

    const playlist = await this.playlistRepository.findActiveLibraryPlaylist(playlistId, library.id);
    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    const link = await this.libraryTrackRepository.getByLibraryAndTrack(library.id, body.trackId);
    if (!link) {
      throw new BadRequestException('Track is not in your library');
    }

    await this.playlistRepository.addTrackToPlaylist(playlistId, body.trackId);
    return { ok: true as const };
  }
}
