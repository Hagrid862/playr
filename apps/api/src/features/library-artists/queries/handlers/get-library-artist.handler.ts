import { LibraryArtistRepository } from '@/shared/repositories/library-artist.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { NotFoundException, PreconditionFailedException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetLibraryArtistResponseDto } from '@repo/contracts';
import { GetLibraryArtistQuery } from '../impl/get-library-artist.query';

@QueryHandler(GetLibraryArtistQuery)
export class GetLibraryArtistHandler implements IQueryHandler<GetLibraryArtistQuery> {
  constructor(
    private readonly libraryRepository: LibraryRepository,
    private readonly libraryArtistRepository: LibraryArtistRepository,
  ) {}

  async execute(query: GetLibraryArtistQuery): Promise<GetLibraryArtistResponseDto['data']> {
    const { userId, artistId } = query;

    const library = await this.libraryRepository.getByUserId(userId);

    if (!library) {
      throw new PreconditionFailedException('User library not found');
    }

    const libraryArtist = await this.libraryArtistRepository.findOne({
      libraryId: library.id,
      artistId,
    });
    if (!libraryArtist) {
      throw new NotFoundException('Artist not found in user library');
    }

    return libraryArtist;
  }
}
