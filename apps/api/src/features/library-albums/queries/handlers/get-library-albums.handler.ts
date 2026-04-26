import { LibraryAlbumRepository } from '@/shared/repositories/library-album.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PreconditionFailedException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetLibraryAlbumsQuery } from '../impl/get-library-albums.query';
import { GetLibraryAlbumsResponse } from '@repo/contracts';

@QueryHandler(GetLibraryAlbumsQuery)
export class GetLibraryAlbumsHandler implements IQueryHandler<GetLibraryAlbumsQuery> {
  constructor(
    private readonly libraryRepository: LibraryRepository,
    private readonly libraryAlbumRepository: LibraryAlbumRepository,
  ) {}

  async execute(query: GetLibraryAlbumsQuery): Promise<GetLibraryAlbumsResponse['data']> {
    const { userId, page, limit } = query;

    const library = await this.libraryRepository.findOne({ userId });

    if (!library) {
      throw new PreconditionFailedException(`User library not found for userId: ${userId}`);
    }

    const [items, total] = await Promise.all([
      this.libraryAlbumRepository.findManyWithInclude(
        { libraryId: library.id },
        {
          album: {
            include: {
              artists: true,
              cover: true,
            },
          },
        },
        {
          take: limit,
          skip: (page - 1) * limit,
        },
      ),
      this.libraryAlbumRepository.count({ libraryId: library.id }),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }
}
