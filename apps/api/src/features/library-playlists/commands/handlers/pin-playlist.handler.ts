import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PlaylistRepository } from '@/shared/repositories/playlist.repository';
import { NotFoundException, PreconditionFailedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PinPlaylistResponse } from '@repo/contracts';
import { PinPlaylistCommand } from '../impl/pin-playlist.command';

@CommandHandler(PinPlaylistCommand)
export class PinPlaylistHandler implements ICommandHandler<PinPlaylistCommand> {
  constructor(
    private readonly libraryRepository: LibraryRepository,
    private readonly playlistRepository: PlaylistRepository,
  ) {}

  async execute(command: PinPlaylistCommand): Promise<PinPlaylistResponse['data']> {
    const { body, userId } = command;
    const library = await this.libraryRepository.getByUserId(userId);
    if (!library) {
      throw new PreconditionFailedException(`User library not found for userId: ${userId}`);
    }

    const playlist = await this.playlistRepository.findActiveLibraryPlaylist(
      body.playlistId,
      library.id,
    );
    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    const nextOrder = (await this.playlistRepository.maxPinOrder(library.id)) + 1;
    const pin = await this.playlistRepository.pinPlaylist(library.id, body.playlistId, nextOrder);

    const withCover = await this.playlistRepository.listLibraryPlaylistsWithCover(library.id);
    const pl = withCover.find((p) => p.id === pin.playlistId);

    return {
      id: pin.id,
      order: pin.order,
      playlist: {
        id: playlist.id,
        name: playlist.name,
        systemRole: playlist.systemRole,
        cover: pl?.cover ?? undefined,
      },
    };
  }
}
