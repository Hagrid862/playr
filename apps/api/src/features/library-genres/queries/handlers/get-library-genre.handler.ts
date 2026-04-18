import { GenreRepository } from '@/shared/repositories/genre.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import {
    InternalServerErrorException,
    NotFoundException,
    PreconditionFailedException,
} from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { GetLibraryGenreResponse } from '@repo/contracts';
import { GenreSchema } from '@repo/contracts';
import { GetLibraryGenreQuery } from '../impl/get-library-genre.query';

@QueryHandler(GetLibraryGenreQuery)
export class GetLibraryGenreHandler implements IQueryHandler<GetLibraryGenreQuery> {
  constructor(
    private readonly libraryRepository: LibraryRepository,
    private readonly genreRepository: GenreRepository,
  ) {}

  async execute(query: GetLibraryGenreQuery): Promise<GetLibraryGenreResponse['data']> {
    const { userId, genreId } = query;

    const library = await this.libraryRepository.getByUserId(userId);

    if (!library) {
      throw new PreconditionFailedException('User library not found');
    }

    const genre = await this.genreRepository.findOne({
      id: genreId,
      deletedAt: null,
      OR: [{ libraryId: null }, { libraryId: library.id }],
    });

    if (!genre) {
      throw new NotFoundException('Genre not found');
    }

    const parsed = GenreSchema.safeParse(genre);

    if (!parsed.success) {
      throw new InternalServerErrorException('Genre response failed validation');
    }

    return parsed.data;
  }
}
