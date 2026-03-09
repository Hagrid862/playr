import { BulkCreateLibraryTracksResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class BulkCreateLibraryTracksResponseDto extends createZodDto(
  BulkCreateLibraryTracksResponseSchema,
) {}
