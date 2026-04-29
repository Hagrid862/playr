import { ArtistRepository } from '@/shared/repositories/artist.repository';
import { LibraryRepository } from '@/shared/repositories/library.repository';
import { PreconditionFailedException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetLibraryArtistNameAvailabilityResponse } from '@repo/contracts';
import { GetLibraryArtistNameAvailabilityQuery } from '../impl/get-library-artist-name-availability.query';

@QueryHandler(GetLibraryArtistNameAvailabilityQuery)
export class GetLibraryArtistNameAvailabilityHandler implements IQueryHandler<GetLibraryArtistNameAvailabilityQuery> {
  constructor(
    private readonly libraryRepository: LibraryRepository,
    private readonly artistRepository: ArtistRepository,
  ) {}

  async execute(
    query: GetLibraryArtistNameAvailabilityQuery,
  ): Promise<GetLibraryArtistNameAvailabilityResponse['data']> {
    const { userId, name } = query;

    const library = await this.libraryRepository.getByUserId(userId);
    if (!library) {
      throw new PreconditionFailedException('User library not found');
    }

    const existing = await this.artistRepository.getByNameForOwner(name, userId);
    return { available: existing === null };
  }
}
