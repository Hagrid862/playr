import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PlaylistRepository } from '@/shared/repositories/playlist.repository';
import { PreconditionFailedException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  GetLibraryPlaylistsResponse,
  type LibraryPlaylistListItem,
} from '@repo/contracts';
import { PlaylistSystemRole } from '@repo/db';
import { GetLibraryPlaylistsQuery } from '../impl/get-library-playlists.query';

@QueryHandler(GetLibraryPlaylistsQuery)
export class GetLibraryPlaylistsHandler implements IQueryHandler<GetLibraryPlaylistsQuery> {
  constructor(
    private readonly libraryRepository: LibraryRepository,
    private readonly playlistRepository: PlaylistRepository,
  ) {}

  async execute(query: GetLibraryPlaylistsQuery): Promise<GetLibraryPlaylistsResponse['data']> {
    const { userId } = query;
    const library = await this.libraryRepository.getByUserId(userId);
    if (!library) {
      throw new PreconditionFailedException(`User library not found for userId: ${userId}`);
    }

    const [playlists, pins] = await Promise.all([
      this.playlistRepository.listLibraryPlaylistsWithCover(library.id),
      this.playlistRepository.listActivePinsForLibrary(library.id),
    ]);

    const pinOrderByPlaylistId = new Map<string, number>();
    const pinIdByPlaylistId = new Map<string, string>();
    for (const pin of pins) {
      pinOrderByPlaylistId.set(pin.playlistId, pin.order);
      pinIdByPlaylistId.set(pin.playlistId, pin.id);
    }

    const toItem = (p: (typeof playlists)[number]): LibraryPlaylistListItem => ({
      id: p.id,
      name: p.name,
      systemRole: p.systemRole,
      cover: p.cover ?? undefined,
      trackCount: p._count.tracks,
      pinned: pinOrderByPlaylistId.has(p.id),
      pinOrder: pinOrderByPlaylistId.get(p.id) ?? null,
      pinId: pinIdByPlaylistId.get(p.id) ?? null,
    });

    const sorted = [...playlists].sort((a, b) => {
      const aFav = a.systemRole === PlaylistSystemRole.favorites;
      const bFav = b.systemRole === PlaylistSystemRole.favorites;
      if (aFav !== bFav) {
        return aFav ? -1 : 1;
      }
      const aPin = !aFav && pinOrderByPlaylistId.has(a.id);
      const bPin = !bFav && pinOrderByPlaylistId.has(b.id);
      if (aPin !== bPin) {
        return aPin ? -1 : 1;
      }
      if (aPin && bPin) {
        return (pinOrderByPlaylistId.get(a.id) ?? 0) - (pinOrderByPlaylistId.get(b.id) ?? 0);
      }
      return a.name.localeCompare(b.name);
    });

    return { items: sorted.map(toItem) };
  }
}
