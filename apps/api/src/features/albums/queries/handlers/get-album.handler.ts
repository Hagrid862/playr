import { AlbumRepository } from '@/shared/repositories/album.repository';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AlbumSchema, ZodAlbum } from '@repo/contracts';
import { GetAlbumQuery } from '../impl/get-album.query';

@QueryHandler(GetAlbumQuery)
export class GetAlbumHandler implements IQueryHandler<GetAlbumQuery> {
  constructor(private readonly albumRepository: AlbumRepository) {}

  async execute(query: GetAlbumQuery): Promise<ZodAlbum> {
    const { id } = query;

    const album = await this.albumRepository.getByIdDetailed(id);

    if (!album) {
      throw new NotFoundException('Album not found');
    }

    const parsed = AlbumSchema.safeParse(album);

    if (!parsed.success) {
      throw new InternalServerErrorException('Failed to parse album');
    }

    return parsed.data;
  }
}
