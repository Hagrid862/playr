import { LibraryTrackRepository } from '@/shared/repositories/library-track.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PreconditionFailedException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetLibraryAlbumTracksResponse } from '@repo/contracts';
import { GetLibraryAlbumTracksQuery } from '../impl/get-library-album-tracks.query';

@QueryHandler(GetLibraryAlbumTracksQuery)
export class GetLibraryAlbumTracksHandler implements IQueryHandler<GetLibraryAlbumTracksQuery> {
  constructor(
    private readonly libraryRepository: LibraryRepository,
    private readonly libraryTrackRepository: LibraryTrackRepository,
  ) {}

  async execute(query: GetLibraryAlbumTracksQuery): Promise<GetLibraryAlbumTracksResponse['data']> {
    const { userId, albumId } = query;

    const library = await this.libraryRepository.getByUserId(userId);

    if (!library) {
      throw new PreconditionFailedException(`User library not found for userId: ${userId}`);
    }

    const items = await this.libraryTrackRepository.findMany({
      where: {
        libraryId: library.id,
        track: {
          albumId,
        },
      },
      orderBy: [{ track: { diskNumber: 'asc' } }, { track: { trackNumber: 'asc' } }],
    });

    return items.map((lt) => lt.track);
  }
}
