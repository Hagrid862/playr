import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PlaylistRepository } from '@/shared/repositories/playlist.repository';
import {
  BadRequestException,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { SortPlaylistTracksRequest, SortPlaylistTracksResponse } from '@repo/contracts';
import { PlaylistSystemRole } from '@repo/db';
import { SortPlaylistTracksCommand } from '../impl/sort-playlist-tracks.command';

@CommandHandler(SortPlaylistTracksCommand)
export class SortPlaylistTracksHandler implements ICommandHandler<SortPlaylistTracksCommand> {
  constructor(
    private readonly libraryRepository: LibraryRepository,
    private readonly playlistRepository: PlaylistRepository,
  ) {}

  async execute(command: SortPlaylistTracksCommand): Promise<SortPlaylistTracksResponse['data']> {
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
      throw new BadRequestException('Cannot sort tracks in the favorites playlist');
    }

    const direction = this.directionFromSort(body.sort);
    await this.playlistRepository.sortPlaylistTracksByAddedAt(playlistId, direction);
    return { ok: true as const };
  }

  private directionFromSort(sort: SortPlaylistTracksRequest['sort']): 'asc' | 'desc' {
    switch (sort) {
      case 'addedAt_asc':
        return 'asc';
      case 'addedAt_desc':
        return 'desc';
      default: {
        const _exhaustive: never = sort;
        return _exhaustive;
      }
    }
  }
}
