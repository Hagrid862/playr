import { ArtistRepository } from '@/shared/repositories/artist.repository';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ZodArtist } from '@repo/contracts';
import { GetPrivateArtistsQuery } from '../impl/get-private-artists.query';

@QueryHandler(GetPrivateArtistsQuery)
export class GetPrivateArtistsHandler implements IQueryHandler<GetPrivateArtistsQuery> {
  constructor(private readonly artistRepository: ArtistRepository) {}

  async execute(query: GetPrivateArtistsQuery): Promise<ZodArtist[]> {
    const { userId } = query;
    return this.artistRepository.findMany({
      where: {
        access: {
          some: { userId },
        },
      },
    });
  }
}
