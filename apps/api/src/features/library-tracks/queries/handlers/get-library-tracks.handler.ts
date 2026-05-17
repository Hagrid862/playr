import { LibraryTrackRepository } from '@/shared/repositories/library-track.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PreconditionFailedException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetLibraryTracksResponse, type ZodTrack } from '@repo/contracts';
import { Prisma } from '@repo/db';
import { GetLibraryTracksQuery } from '../impl/get-library-tracks.query';
import { buildGetLibraryTracksOrderBy } from './get-library-tracks.order-by';

const LIBRARY_TRACK_WITH_TRACK_INCLUDE = {
  track: {
    include: {
      artists: true,
      album: {
        include: {
          cover: true,
        },
      },
      genres: { include: { genre: true } },
    },
  },
} satisfies Prisma.LibraryTrackInclude;

@QueryHandler(GetLibraryTracksQuery)
export class GetLibraryTracksHandler implements IQueryHandler<GetLibraryTracksQuery> {
  constructor(
    private readonly libraryRepository: LibraryRepository,
    private readonly libraryTrackRepository: LibraryTrackRepository,
  ) {}

  async execute(query: GetLibraryTracksQuery): Promise<GetLibraryTracksResponse['data']> {
    const { userId, page, limit, albumId, genreId, sortBy, sortOrder } = query;

    const library = await this.libraryRepository.getByUserId(userId);

    if (!library) {
      throw new PreconditionFailedException(`User library not found for userId: ${userId}`);
    }

    const where: Prisma.LibraryTrackWhereInput = {
      libraryId: library.id,
      track: {
        ...(albumId ? { albumId } : {}),
        ...(genreId ? { genres: { some: { genreId } } } : {}),
      },
    };

    const isArtistSort = sortBy === 'artist' && sortOrder !== undefined;

    const itemsPromise =
      isArtistSort && sortOrder
        ? (async () => {
            const ids = await this.libraryTrackRepository.getIdsPaginatedByMinArtistName({
              libraryId: library.id,
              albumId,
              genreId,
              page,
              limit,
              sortOrder,
            });
            return this.libraryTrackRepository.findManyByIdsOrdered(ids, {
              include: LIBRARY_TRACK_WITH_TRACK_INCLUDE,
            });
          })()
        : this.libraryTrackRepository.getPaginated(
            page,
            limit,
            where,
            buildGetLibraryTracksOrderBy(sortBy, sortOrder),
            { include: LIBRARY_TRACK_WITH_TRACK_INCLUDE },
          );

    const [items, total] = await Promise.all([
      itemsPromise,
      this.libraryTrackRepository.count(where),
    ]);

    return {
      items: (items as unknown as { track: ZodTrack }[]).map((lt) => lt.track),
      total,
      page,
      limit,
    };
  }
}
