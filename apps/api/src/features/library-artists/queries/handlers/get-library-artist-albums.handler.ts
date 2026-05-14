import { LibraryAlbumRepository } from '@/shared/repositories/library-album.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PreconditionFailedException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetLibraryArtistAlbumsResponseDto } from '@repo/contracts';
import { Prisma } from '@repo/db';
import { GetLibraryArtistAlbumsQuery } from '../impl/get-library-artist-albums.query';

const LIBRARY_ALBUM_LIST_INCLUDE = {
  album: {
    include: {
      cover: true,
      artists: true,
      genres: { include: { genre: true } },
    },
  },
} satisfies Prisma.LibraryAlbumInclude;

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

    const library = await this.libraryRepository.getByUserId(userId);

    if (!library) {
      throw new PreconditionFailedException('User library not found');
    }

    const [items, total] = await Promise.all([
      this.libraryAlbumRepository.getPaginated(
        page,
        limit,
        {
          libraryId: library.id,
          album: { artists: { some: { id: artistId } }, type: type },
        },
        {
          album: {
            releaseDate: 'desc',
          },
        },
        { include: LIBRARY_ALBUM_LIST_INCLUDE },
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
