import { GetLibraryAlbumTracksResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class GetLibraryAlbumTracksResponseDto extends createZodDto(
  GetLibraryAlbumTracksResponseSchema,
) {}
