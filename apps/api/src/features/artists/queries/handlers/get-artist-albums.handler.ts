import { AlbumRepository } from '@/shared/repositories/album.repository';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ZodAlbum } from '@repo/contracts';
import { GetArtistAlbumsQuery } from '../impl/get-artist-albums.query';

@QueryHandler(GetArtistAlbumsQuery)
export class GetArtistAlbumsHandler implements IQueryHandler<GetArtistAlbumsQuery> {
  constructor(private readonly albumRepository: AlbumRepository) {}

  async execute(query: GetArtistAlbumsQuery): Promise<ZodAlbum[]> {
    const { artistId, userId } = query;
    return this.albumRepository.findMany({
      where: {
        artists: { some: { id: artistId } },
        OR: [
          { visibility: 'PUBLIC' },
          { access: { some: { userId } } },
          {
            artists: {
              some: {
                access: { some: { userId } },
              },
            },
          },
        ],
      },
    });
  }
}
