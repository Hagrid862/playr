import { LibraryTrackRepository } from '@/shared/repositories/library-track.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { InternalServerErrorException, PreconditionFailedException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetLibraryAlbumTracksResponse, TrackSchema } from '@repo/contracts';
import { GetLibraryAlbumTracksQuery } from '../impl/get-library-album-tracks.query';

@QueryHandler(GetLibraryAlbumTracksQuery)
export class GetLibraryAlbumTracksHandler implements IQueryHandler<GetLibraryAlbumTracksQuery> {
  constructor(
    private readonly libraryRepository: LibraryRepository,
    private readonly libraryTrackRepository: LibraryTrackRepository,
  ) {}

  async execute(query: GetLibraryAlbumTracksQuery): Promise<GetLibraryAlbumTracksResponse['data']> {
    const { userId, albumId } = query;

    const library = await this.libraryRepository.findOne({ userId });

    if (!library) {
      throw new PreconditionFailedException(`User library not found`);
    }

    const items = await this.libraryTrackRepository.findManyWithInclude(
      {
        libraryId: library.id,
        track: {
          albumId,
        },
      },
      {
        track: {
          include: {
            artists: true,
            album: {
              include: {
                cover: true,
              },
            },
          },
        },
      },
      {
        orderBy: [{ track: { diskNumber: 'asc' } }, { track: { trackNumber: 'asc' } }],
      },
    );

    return items.map((lt) => {
      const parsedTrack = TrackSchema.safeParse(lt.track);
      if (!parsedTrack.success) {
        throw new InternalServerErrorException('Failed to parse track');
      }

      return parsedTrack.data;
    });
  }
}
