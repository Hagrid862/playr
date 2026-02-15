import { LibraryTrackRepository } from '@/shared/repositories/library-track.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PreconditionFailedException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetLibraryTracksResponse } from '@repo/contracts';
import { GetLibraryTracksQuery } from '../impl/get-library-tracks.query';

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
      this.libraryTrackRepository.findMany({
        where: {
          libraryId: library.id,
          track: albumId ? { albumId } : undefined,
        },
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { track: { trackNumber: 'asc' } }, // Sort by track number
      }),
      this.libraryTrackRepository.count({
        libraryId: library.id,
        track: albumId ? { albumId } : undefined,
      }),
    ]);

    return {
      items: items.map((lt: any) => lt.track),
      total,
      page,
      limit,
    } as any;
  }
}
