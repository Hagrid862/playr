import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PreconditionFailedException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetLibraryArtistAlbumsResponseDto } from '@repo/contracts';
import { GetLibraryArtistAlbumsQuery } from '../impl/get-library-artist-albums.query';
import { LibraryAlbumRepository } from '@/shared/repositories/library-album.repository';

@QueryHandler(GetLibraryArtistAlbumsQuery)
export class GetLibraryArtistAlbumsHandler implements IQueryHandler<GetLibraryArtistAlbumsQuery> {
  constructor(
    private readonly libraryAlbumRepository: LibraryAlbumRepository,
    private readonly libraryRepository: LibraryRepository,
  ) {}

  async execute(
    query: GetLibraryArtistAlbumsQuery,
  ): Promise<GetLibraryArtistAlbumsResponseDto['data']> {
    const { userId, artistId, page, limit, type } = query;

    const library = await this.libraryRepository.findOne({ userId });

    if (!library) {
      throw new PreconditionFailedException('User library not found');
    }

    const [items, total] = await Promise.all([
      this.libraryAlbumRepository.findManyWithInclude(
        {
          libraryId: library.id,
          album: { artists: { some: { id: artistId } }, type: type },
        },
        {
          take: limit,
          skip: (page - 1) * limit,
          orderBy: {
            album: {
              releaseDate: 'desc',
            },
          },
        },
        {
          album: {
            include: {
              artists: true,
              cover: true,
            },
          },
        },
      ),
      this.libraryAlbumRepository.count({
        libraryId: library.id,
        album: { artists: { some: { id: artistId } }, type: type },
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }
}
