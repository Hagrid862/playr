import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PlaylistRepository } from '@/shared/repositories/playlist.repository';
import { PreconditionFailedException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetLibraryPlaylistPinsResponse } from '@repo/contracts';
import { GetLibraryPlaylistPinsQuery } from '../impl/get-library-playlist-pins.query';

@QueryHandler(GetLibraryPlaylistPinsQuery)
export class GetLibraryPlaylistPinsHandler implements IQueryHandler<GetLibraryPlaylistPinsQuery> {
  constructor(
    private readonly libraryRepository: LibraryRepository,
    private readonly playlistRepository: PlaylistRepository,
  ) {}

  async execute(
    query: GetLibraryPlaylistPinsQuery,
  ): Promise<GetLibraryPlaylistPinsResponse['data']> {
    const { userId } = query;
    const library = await this.libraryRepository.getByUserId(userId);
    if (!library) {
      throw new PreconditionFailedException(`User library not found for userId: ${userId}`);
    }

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
