import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PlaylistRepository } from '@/shared/repositories/playlist.repository';
import { BadRequestException, PreconditionFailedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ReorderPlaylistPinsResponse } from '@repo/contracts';
import { ReorderPlaylistPinsCommand } from '../impl/reorder-playlist-pins.command';

@CommandHandler(ReorderPlaylistPinsCommand)
export class ReorderPlaylistPinsHandler implements ICommandHandler<ReorderPlaylistPinsCommand> {
  constructor(
    private readonly libraryRepository: LibraryRepository,
    private readonly playlistRepository: PlaylistRepository,
  ) {}

  async execute(command: ReorderPlaylistPinsCommand): Promise<ReorderPlaylistPinsResponse['data']> {
    const { body, userId } = command;
    const library = await this.libraryRepository.getByUserId(userId);
    if (!library) {
      throw new PreconditionFailedException(`User library not found for userId: ${userId}`);
    }

    const current = await this.playlistRepository.listActivePinsForLibrary(library.id);
    const currentIds = new Set(current.map((p) => p.id));
    if (new Set(body.orderedIds).size !== body.orderedIds.length) {
      throw new BadRequestException('orderedIds must not contain duplicate pin ids');
    }
    if (body.orderedIds.length !== current.length) {
      throw new BadRequestException('orderedIds must include every pin exactly once');
    }
    for (const id of body.orderedIds) {
      if (!currentIds.has(id)) {
        throw new BadRequestException('Unknown pin id in orderedIds');
      }
    }

    await this.playlistRepository.reorderPins(library.id, body.orderedIds);

    const pins = await this.playlistRepository.listActivePinsForLibrary(library.id);
    return pins.map((pin) => ({
      id: pin.id,
      order: pin.order,
      playlist: {
        id: pin.playlist.id,
        name: pin.playlist.name,
        systemRole: pin.playlist.systemRole,
        cover: pin.playlist.cover ?? undefined,
      },
    }));
  }
}
