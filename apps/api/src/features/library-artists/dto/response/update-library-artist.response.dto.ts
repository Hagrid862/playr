import { UpdateLibraryArtistResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateLibraryArtistResponseDto extends createZodDto(
  UpdateLibraryArtistResponseSchema,
) {}
