import { LibraryAlbumRepository } from '@/shared/repositories/library-album.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PreconditionFailedException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { LibraryAlbumSchema, ZodLibraryAlbum } from '@repo/contracts';
import { GetLibraryAlbumsQuery } from '../impl/get-library-albums.query';

@QueryHandler(GetLibraryAlbumsQuery)
export class GetLibraryAlbumsHandler implements IQueryHandler<GetLibraryAlbumsQuery> {
  constructor(
    private readonly libraryRepository: LibraryRepository,
    private readonly libraryAlbumRepository: LibraryAlbumRepository,
  ) {}

  async execute(
    query: GetLibraryAlbumsQuery,
  ): Promise<{ items: ZodLibraryAlbum[]; total: number; page: number; limit: number }> {
    const { userId, page, limit } = query;

    const library = await this.libraryRepository.getByUserId(userId);

    if (!library) {
      throw new PreconditionFailedException('User library not found');
    }

    const [items, total] = await Promise.all([
      this.libraryAlbumRepository.findMany({
        where: { libraryId: library.id },
        take: limit,
        skip: (page - 1) * limit,
      }),
      this.libraryAlbumRepository.count({ libraryId: library.id }),
    ]);

    const parsed = LibraryAlbumSchema.array().safeParse(items);

    if (!parsed.success) {
      throw new PreconditionFailedException('Failed to parse library albums');
    }

    return {
      items: parsed.data,
      total,
      page,
      limit,
    };
  }
}
