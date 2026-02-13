import { CreateLibraryArtistResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateLibraryArtistResponseDto extends createZodDto(
  CreateLibraryArtistResponseSchema,
) {}
