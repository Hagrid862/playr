import { UpdateLibraryPlaylistRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateLibraryPlaylistRequestDto extends createZodDto(
  UpdateLibraryPlaylistRequestSchema,
) {}
