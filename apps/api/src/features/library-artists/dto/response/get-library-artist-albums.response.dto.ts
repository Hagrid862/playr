import { GetLibraryArtistAlbumsResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class GetLibraryArtistAlbumsResponseDto extends createZodDto(
  GetLibraryArtistAlbumsResponseSchema,
) {}
