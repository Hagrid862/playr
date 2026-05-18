import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PlaylistRepository } from '@/shared/repositories/playlist.repository';
import {
  BadRequestException,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateLibraryPlaylistResponse, type LibraryPlaylistListItem } from '@repo/contracts';
import { PlaylistSystemRole } from '@repo/db';
import { UpdateLibraryPlaylistCommand } from '../impl/update-library-playlist.command';

@CommandHandler(UpdateLibraryPlaylistCommand)
export class UpdateLibraryPlaylistHandler implements ICommandHandler<UpdateLibraryPlaylistCommand> {
  constructor(
    private readonly libraryRepository: LibraryRepository,
    private readonly playlistRepository: PlaylistRepository,
  ) {}

  async execute(
    command: UpdateLibraryPlaylistCommand,
  ): Promise<UpdateLibraryPlaylistResponse['data']> {
    const { playlistId, body, userId } = command;
    const library = await this.libraryRepository.getByUserId(userId);
    if (!library) {
      throw new PreconditionFailedException(`User library not found for userId: ${userId}`);
    }

    const playlist = await this.playlistRepository.findActiveLibraryPlaylist(playlistId, library.id);
    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    if (playlist.systemRole === PlaylistSystemRole.favorites) {
      throw new BadRequestException('Cannot rename the favorites playlist');
    }

    const name = body.name.trim();
    if (!name) {
      throw new BadRequestException('Name is required');
    }

    await this.playlistRepository.updatePlaylistName(playlistId, name);

    const [withCovers, pins] = await Promise.all([
      this.playlistRepository.listLibraryPlaylistsWithCover(library.id),
      this.playlistRepository.listActivePinsForLibrary(library.id),
    ]);
    const row = withCovers.find((p) => p.id === playlistId);
    if (!row) {
      throw new NotFoundException('Playlist not found');
    }
    const pin = pins.find((p) => p.playlistId === playlistId);

    const item: LibraryPlaylistListItem = {
      id: row.id,
      name: row.name,
      systemRole: row.systemRole,
      cover: row.cover ?? undefined,
      trackCount: row._count.tracks,
      pinned: !!pin,
      pinOrder: pin ? pin.order : null,
      pinId: pin ? pin.id : null,
    };
    return item;
  }
}
