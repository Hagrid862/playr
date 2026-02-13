import { ArtistRepository } from '@/shared/repositories/artist.repository';
import { InternalServerErrorException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ArtistSchema, ZodArtist } from '@repo/contracts';
import { GetPrivateArtistsQuery } from '../impl/get-private-artists.query';

@QueryHandler(GetPrivateArtistsQuery)
export class GetPrivateArtistsHandler implements IQueryHandler<GetPrivateArtistsQuery> {
  constructor(private readonly artistRepository: ArtistRepository) {}

  async execute(query: GetPrivateArtistsQuery): Promise<ZodArtist[]> {
    const { userId } = query;

    const artists = await this.artistRepository.getPrivateByUserId(userId);

    const parsed = artists.map((artist) => {
      const result = ArtistSchema.safeParse(artist);
      if (!result.success) {
        throw new InternalServerErrorException('Failed to parse artist from database');
      }
      return result.data;
    });

    return parsed;
  }
}
