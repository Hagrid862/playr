import { GenreRepository } from '@/shared/repositories/genre.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PreconditionFailedException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { GetLibraryGenresResponse } from '@repo/contracts';
import { GetLibraryGenresQuery } from '../impl/get-library-genres.query';

@QueryHandler(GetLibraryGenresQuery)
export class GetLibraryGenresHandler implements IQueryHandler<GetLibraryGenresQuery> {
  constructor(
    private readonly libraryRepository: LibraryRepository,
    private readonly genreRepository: GenreRepository,
  ) {}

  async execute(query: GetLibraryGenresQuery): Promise<GetLibraryGenresResponse['data']> {
    const { userId, page, limit, query: q, kind } = query;

    const library = await this.libraryRepository.getByUserId(userId);

    if (!library) {
      throw new PreconditionFailedException('User library not found');
    }

    const [items, total] = await Promise.all([
      this.genreRepository.getGenresPaginatedForLibrary({
        libraryId: library.id,
        q,
        kind,
        page,
        limit,
      }),
      this.genreRepository.countGenresForLibrary({
        libraryId: library.id,
        q,
        kind,
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
