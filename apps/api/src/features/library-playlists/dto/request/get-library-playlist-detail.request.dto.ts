import { GetLibraryPlaylistDetailRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class GetLibraryPlaylistDetailRequestDto extends createZodDto(
  GetLibraryPlaylistDetailRequestSchema,
) {}
