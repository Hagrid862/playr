import { AlbumRepository } from '@/shared/repositories/album.repository';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AlbumSchema, ZodAlbum } from '@repo/contracts';
import { Prisma } from '@repo/db';
import { GetLibraryAlbumQuery } from '../impl/get-library-album.query';

/** Relations needed for single-album API (tracks ordered, nested shapes for Zod). */
const GET_LIBRARY_ALBUM_INCLUDE = {
  cover: true,
  artists: true,
  genres: { include: { genre: true } },
  tracks: {
    where: { deletedAt: null },
    orderBy: { trackNumber: 'asc' as const },
    include: {
      album: { include: { cover: true } },
      artists: true,
      audioFiles: true,
      genres: { include: { genre: true } },
    },
  },
} satisfies Prisma.AlbumInclude;

@QueryHandler(GetLibraryAlbumQuery)
export class GetLibraryAlbumHandler implements IQueryHandler<GetLibraryAlbumQuery> {
  constructor(private readonly albumRepository: AlbumRepository) {}

  async execute(query: GetLibraryAlbumQuery): Promise<ZodAlbum> {
    const { id } = query;

    const album = await this.albumRepository.getById(id, { include: GET_LIBRARY_ALBUM_INCLUDE });

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
