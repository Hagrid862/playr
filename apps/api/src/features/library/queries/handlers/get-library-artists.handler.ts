import { LibraryArtistRepository } from '@/shared/repositories/library-artist.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PreconditionFailedException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetLibraryArtistsResponseDto } from '@repo/contracts';
import { GetLibraryArtistsQuery } from '../impl/get-library-artists.query';

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
      this.libraryArtistRepository.getByLibraryId(library.id, page, limit),
      this.libraryArtistRepository.countByLibraryId(library.id),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }
}
