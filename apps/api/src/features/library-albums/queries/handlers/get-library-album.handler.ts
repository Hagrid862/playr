import { AlbumRepository } from '@/shared/repositories/album.repository';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AlbumSchema, ZodAlbum } from '@repo/contracts';
import { GetLibraryAlbumQuery } from '../impl/get-library-album.query';

@QueryHandler(GetLibraryAlbumQuery)
export class GetLibraryAlbumHandler implements IQueryHandler<GetLibraryAlbumQuery> {
  constructor(private readonly albumRepository: AlbumRepository) {}

  async execute(query: GetLibraryAlbumQuery): Promise<ZodAlbum> {
    const { id } = query;

    const album = await this.albumRepository.findOne({ id }, true);

    if (!album) {
      throw new NotFoundException('Album not found');
    }

    const parsed = AlbumSchema.safeParse(album);

    if (!parsed.success) {
      console.error(
        '[GetLibraryAlbumHandler] Zod validation failed:',
        JSON.stringify(parsed.error.format(), null, 2),
      );
      throw new InternalServerErrorException('Failed to parse album');
    }

    return parsed.data;
  }
}
