import { LibraryAlbumRepository } from '@/shared/repositories/library-album.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PreconditionFailedException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetLibraryAlbumsResponse } from '@repo/contracts';
import { Prisma } from '@repo/db';
import { GetLibraryAlbumsQuery } from '../impl/get-library-albums.query';

const LIBRARY_ALBUM_LIST_INCLUDE = {
  album: {
    include: {
      cover: true,
      artists: { where: { deletedAt: null } },
      genres: { include: { genre: true } },
    },
  },
} satisfies Prisma.LibraryAlbumInclude;

@QueryHandler(GetLibraryAlbumsQuery)
export class GetLibraryAlbumsHandler implements IQueryHandler<GetLibraryAlbumsQuery> {
  constructor(
    private readonly libraryRepository: LibraryRepository,
    private readonly libraryAlbumRepository: LibraryAlbumRepository,
  ) {}

  async execute(query: GetLibraryAlbumsQuery): Promise<GetLibraryAlbumsResponse['data']> {
    const { userId, page, limit, genreId } = query;

    const library = await this.libraryRepository.getByUserId(userId);

    if (!library) {
      throw new PreconditionFailedException(`User library not found for userId: ${userId}`);
    }

    const where: Prisma.LibraryAlbumWhereInput = { libraryId: library.id };
    if (genreId) {
      where.album = {
        genres: {
          some: { genreId },
        },
      };
    }

    const [items, total] = await Promise.all([
      this.libraryAlbumRepository.getPaginated(page, limit, where, undefined, {
        include: LIBRARY_ALBUM_LIST_INCLUDE,
      }),
      this.libraryAlbumRepository.count(where),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }
}
