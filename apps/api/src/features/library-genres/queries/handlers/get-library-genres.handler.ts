import { GenreRepository } from '@/shared/repositories/genre.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PreconditionFailedException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { GenreWhereInput } from '@repo/db';
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

    const library = await this.libraryRepository.findOne({ userId });

    if (!library) {
      throw new PreconditionFailedException('User library not found');
    }

    const skip = (page - 1) * limit;
    const trimmedQ = q?.trim();
    const where: GenreWhereInput = {
      kind,
      OR: [{ libraryId: null }, { libraryId: library.id }],
      ...(trimmedQ
        ? {
            AND: [
              {
                OR: [
                  { name: { contains: trimmedQ, mode: 'insensitive' } },
                  { slug: { contains: trimmedQ, mode: 'insensitive' } },
                ],
              },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.genreRepository.findMany(where, {
        skip,
        take: limit,
      }),
      this.genreRepository.count(where),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }
}
