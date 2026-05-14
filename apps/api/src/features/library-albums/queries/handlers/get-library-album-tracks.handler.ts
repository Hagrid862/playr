import { AlbumRepository } from '@/shared/repositories/album.repository';
import { LibraryTrackRepository } from '@/shared/repositories/library-track.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { NotFoundException, PreconditionFailedException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetLibraryAlbumTracksResponse, type ZodTrack } from '@repo/contracts';
import { Prisma } from '@repo/db';
import { GetLibraryAlbumTracksQuery } from '../impl/get-library-album-tracks.query';

const LIBRARY_TRACK_WITH_TRACK_INCLUDE = {
  track: {
    include: {
      artists: true,
      album: true,
      genres: { include: { genre: true } },
    },
  },
} satisfies Prisma.LibraryTrackInclude;

@QueryHandler(GetLibraryAlbumTracksQuery)
export class GetLibraryAlbumTracksHandler implements IQueryHandler<GetLibraryAlbumTracksQuery> {
  constructor(
    private readonly libraryRepository: LibraryRepository,
    private readonly albumRepository: AlbumRepository,
    private readonly libraryTrackRepository: LibraryTrackRepository,
  ) {}

  async execute(query: GetLibraryAlbumTracksQuery): Promise<GetLibraryAlbumTracksResponse['data']> {
    const { userId, albumId } = query;

    const library = await this.libraryRepository.getByUserId(userId);

    if (!library) {
      throw new PreconditionFailedException(`User library not found for userId: ${userId}`);
    }

    if (!(await this.albumRepository.getById(albumId))) {
      throw new NotFoundException('Album not found');
    }

    const items = await this.libraryTrackRepository.listByLibraryAndAlbum(library.id, albumId, {
      orderBy: [{ track: { diskNumber: 'asc' } }, { track: { trackNumber: 'asc' } }],
      include: LIBRARY_TRACK_WITH_TRACK_INCLUDE,
    });

    return (items as unknown as { track: ZodTrack }[]).map((lt) => lt.track);
  }
}
