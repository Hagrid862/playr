import { GetLibraryArtistAlbumsRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class GetLibraryArtistAlbumsRequestDto extends createZodDto(
  GetLibraryArtistAlbumsRequestSchema,
) {}
