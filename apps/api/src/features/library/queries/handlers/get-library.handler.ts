import { LibraryRepository } from '@/shared/repositories/library.repository';
import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Library } from '@repo/db';
import { GetLibraryQuery } from '../impl/get-library.query';

@QueryHandler(GetLibraryQuery)
export class GetLibraryHandler implements IQueryHandler<GetLibraryQuery> {
  constructor(private readonly libraryRepository: LibraryRepository) {}

  async execute(query: GetLibraryQuery): Promise<Library> {
    const { userId } = query;

    const library = await this.libraryRepository.getByUserId(userId);

    if (!library) {
      throw new NotFoundException('Library not found');
    }

    return library;
  }
}
