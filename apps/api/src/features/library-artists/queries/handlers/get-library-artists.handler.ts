import { LibraryArtistRepository } from '@/shared/repositories/library-artist.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PreconditionFailedException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetLibraryArtistsResponseDto } from '@repo/contracts';
import { Prisma } from '@repo/db';
import { GetLibraryArtistsQuery } from '../impl/get-library-artists.query';

const LIBRARY_ARTIST_LIST_INCLUDE = {
  artist: {
    include: {
      avatar: true,
      banner: true,
      genres: { include: { genre: true } },
    },
  },
} satisfies Prisma.LibraryArtistInclude;

@QueryHandler(GetLibraryArtistsQuery)
export class GetLibraryArtistsHandler implements IQueryHandler<GetLibraryArtistsQuery> {
  constructor(
    private readonly libraryRepository: LibraryRepository,
    private readonly libraryArtistRepository: LibraryArtistRepository,
  ) {}

  async execute(query: GetLibraryArtistsQuery): Promise<GetLibraryArtistsResponseDto['data']> {
    const { userId, page, limit } = query;

    const library = await this.libraryRepository.getByUserId(userId);

    if (!library) {
      throw new PreconditionFailedException('User library not found');
    }

    const [items, total] = await Promise.all([
      this.libraryArtistRepository.getPaginated(page, limit, { libraryId: library.id }, undefined, {
        include: LIBRARY_ARTIST_LIST_INCLUDE,
      }),
      this.libraryArtistRepository.count({ libraryId: library.id }),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }
}
