import { DeleteLibraryArtistResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class DeleteLibraryArtistResponseDto extends createZodDto(
  DeleteLibraryArtistResponseSchema,
) {}
