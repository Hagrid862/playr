import { AlbumRepository } from '@/shared/repositories/album.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { LibraryTrackRepository } from '@/shared/repositories/library-track.repository';
import { PlaylistRepository } from '@/shared/repositories/playlist.repository';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AddPlaylistAlbumResponse } from '@repo/contracts';
import { AddPlaylistAlbumCommand } from '../impl/add-playlist-album.command';

@CommandHandler(AddPlaylistAlbumCommand)
export class AddPlaylistAlbumHandler implements ICommandHandler<AddPlaylistAlbumCommand> {
  constructor(
    private readonly libraryRepository: LibraryRepository,
    private readonly playlistRepository: PlaylistRepository,
    private readonly libraryTrackRepository: LibraryTrackRepository,
    private readonly albumRepository: AlbumRepository,
  ) {}

  async execute(command: AddPlaylistAlbumCommand): Promise<AddPlaylistAlbumResponse['data']> {
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

    const hasAccess = await this.albumRepository.checkAccess(body.albumId, userId);
    if (!hasAccess) {
      const exists = await this.albumRepository.exists(body.albumId);
      if (!exists) {
        throw new NotFoundException('Album not found');
      }
      throw new ForbiddenException('You do not have access to this album');
    }

    const libraryTracks = await this.libraryTrackRepository.listByLibraryAndAlbum(
      library.id,
      body.albumId,
      {
        orderBy: [{ track: { diskNumber: 'asc' } }, { track: { trackNumber: 'asc' } }],
      },
    );
    const trackIds = libraryTracks.map((lt) => lt.trackId);
    if (trackIds.length === 0) {
      throw new BadRequestException('Album has no tracks in your library');
    }

    const { addedCount } = await this.playlistRepository.addTracksToPlaylist(playlistId, trackIds);
    return { ok: true as const, addedCount, trackCount: trackIds.length };
  }
}
