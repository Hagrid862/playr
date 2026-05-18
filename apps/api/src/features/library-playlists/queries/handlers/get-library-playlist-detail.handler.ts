import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PlaylistRepository } from '@/shared/repositories/playlist.repository';
import { NotFoundException, PreconditionFailedException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetLibraryPlaylistDetailResponse, type ZodTrack } from '@repo/contracts';
import { GetLibraryPlaylistDetailQuery } from '../impl/get-library-playlist-detail.query';

@QueryHandler(GetLibraryPlaylistDetailQuery)
export class GetLibraryPlaylistDetailHandler
  implements IQueryHandler<GetLibraryPlaylistDetailQuery>
{
  constructor(
    private readonly libraryRepository: LibraryRepository,
    private readonly playlistRepository: PlaylistRepository,
  ) {}

  async execute(
    query: GetLibraryPlaylistDetailQuery,
  ): Promise<GetLibraryPlaylistDetailResponse['data']> {
    const { userId, playlistId, page, limit } = query;
    const library = await this.libraryRepository.getByUserId(userId);
    if (!library) {
      throw new PreconditionFailedException(`User library not found for userId: ${userId}`);
    }

    const detail = await this.playlistRepository.getPlaylistDetailPage(
      playlistId,
      library.id,
      page,
      limit,
    );
    if (!detail) {
      throw new NotFoundException('Playlist not found');
    }

    const { playlist, trackRows, totalTracks } = detail;

    return {
      id: playlist.id,
      name: playlist.name,
      systemRole: playlist.systemRole,
      cover: playlist.cover ?? undefined,
      tracks: trackRows.map((row) => ({
        addedAt: row.addedAt,
        track: row.track as unknown as ZodTrack,
      })),
      page,
      limit,
      totalTracks,
    };
  }
}
