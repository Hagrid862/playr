import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PlaylistRepository } from '@/shared/repositories/playlist.repository';
import {
  BadRequestException,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ReorderPlaylistTracksResponse } from '@repo/contracts';
import { PlaylistSystemRole } from '@repo/db';
import { ReorderPlaylistTracksCommand } from '../impl/reorder-playlist-tracks.command';

@CommandHandler(ReorderPlaylistTracksCommand)
export class ReorderPlaylistTracksHandler implements ICommandHandler<ReorderPlaylistTracksCommand> {
  constructor(
    private readonly libraryRepository: LibraryRepository,
    private readonly playlistRepository: PlaylistRepository,
  ) {}

  async execute(
    command: ReorderPlaylistTracksCommand,
  ): Promise<ReorderPlaylistTracksResponse['data']> {
    const { playlistId, body, userId } = command;
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
      throw new BadRequestException('Cannot reorder tracks in the favorites playlist');
    }

    const { orderedTrackIds } = body;
    const current = await this.playlistRepository.listActiveTrackIdsOrdered(playlistId);

    if (orderedTrackIds.length !== current.length) {
      throw new BadRequestException('orderedTrackIds must include every track exactly once');
    }
    if (new Set(orderedTrackIds).size !== orderedTrackIds.length) {
      throw new BadRequestException('orderedTrackIds must not contain duplicate track ids');
    }
    const currentSet = new Set(current);
    for (const id of orderedTrackIds) {
      if (!currentSet.has(id)) {
        throw new BadRequestException('Unknown track id in orderedTrackIds');
      }
    }

    await this.playlistRepository.reorderPlaylistTracks(playlistId, orderedTrackIds);
    return { ok: true as const };
  }
}
