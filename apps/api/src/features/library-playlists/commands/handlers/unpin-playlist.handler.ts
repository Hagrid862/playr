import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PlaylistRepository } from '@/shared/repositories/playlist.repository';
import { NotFoundException, PreconditionFailedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UnpinPlaylistResponse } from '@repo/contracts';
import { UnpinPlaylistCommand } from '../impl/unpin-playlist.command';

@CommandHandler(UnpinPlaylistCommand)
export class UnpinPlaylistHandler implements ICommandHandler<UnpinPlaylistCommand> {
  constructor(
    private readonly libraryRepository: LibraryRepository,
    private readonly playlistRepository: PlaylistRepository,
  ) {}

  async execute(command: UnpinPlaylistCommand): Promise<UnpinPlaylistResponse['data']> {
    const { pinId, userId } = command;
    const library = await this.libraryRepository.getByUserId(userId);
    if (!library) {
      throw new PreconditionFailedException(`User library not found for userId: ${userId}`);
    }

    const pin = await this.playlistRepository.findActivePinById(pinId, library.id);
    if (!pin) {
      throw new NotFoundException('Pin not found');
    }

    await this.playlistRepository.softDeletePin(pinId);
    return { id: pinId };
  }
}
