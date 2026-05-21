import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PlaylistRepository } from '@/shared/repositories/playlist.repository';
import {
  BadRequestException,
  ConflictException,
  PreconditionFailedException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateLibraryPlaylistResponse, type LibraryPlaylistListItem } from '@repo/contracts';
import { CreateLibraryPlaylistCommand } from '../impl/create-library-playlist.command';

@CommandHandler(CreateLibraryPlaylistCommand)
export class CreateLibraryPlaylistHandler implements ICommandHandler<CreateLibraryPlaylistCommand> {
  constructor(
    private readonly libraryRepository: LibraryRepository,
    private readonly playlistRepository: PlaylistRepository,
  ) {}

  async execute(
    command: CreateLibraryPlaylistCommand,
  ): Promise<CreateLibraryPlaylistResponse['data']> {
    const { body, userId } = command;
    const library = await this.libraryRepository.getByUserId(userId);
    if (!library) {
      throw new PreconditionFailedException(`User library not found for userId: ${userId}`);
    }

    const name = body.name.trim();
    if (!name) {
      throw new BadRequestException('Name is required');
    }

    const nameTaken = await this.playlistRepository.getByNameForLibrary(library.id, name);
    if (nameTaken) {
      throw new ConflictException('This playlist name is already taken');
    }

    const created = await this.playlistRepository.createUserPlaylist(library.id, name);

    const item: LibraryPlaylistListItem = {
      id: created.id,
      name: created.name,
      systemRole: created.systemRole,
      cover: undefined,
      trackCount: 0,
      pinned: false,
      pinOrder: null,
      pinId: null,
    };
    return item;
  }
}
