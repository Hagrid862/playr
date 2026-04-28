import { LibraryTrackRepository } from '@/shared/repositories/library-track.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PreconditionFailedException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetLibraryTracksResponse, type ZodTrack } from '@repo/contracts';
import { Prisma } from '@repo/db';
import { GetLibraryTracksQuery } from '../impl/get-library-tracks.query';

const LIBRARY_TRACK_WITH_TRACK_INCLUDE = {
  track: {
    include: {
      artists: true,
      album: true,
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
    const { userId, page, limit, albumId } = query;

    const library = await this.libraryRepository.getByUserId(userId);

    if (!library) {
      throw new PreconditionFailedException(`User library not found for userId: ${userId}`);
    }

    const [items, total] = await Promise.all([
      this.libraryTrackRepository.getPaginated(
        page,
        limit,
        {
          libraryId: library.id,
          track: albumId ? { albumId } : undefined,
        },
        { track: { trackNumber: 'asc' } },
        { include: LIBRARY_TRACK_WITH_TRACK_INCLUDE },
      ),
      this.libraryTrackRepository.count({
        libraryId: library.id,
        track: albumId ? { albumId } : undefined,
      }),
    ]);

    return {
      items: (items as unknown as { track: ZodTrack }[]).map((lt) => lt.track),
      total,
      page,
      limit,
    };
  }
}
