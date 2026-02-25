import { BulkCreateLibraryTracksRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class BulkCreateLibraryTracksRequestDto extends createZodDto(
  BulkCreateLibraryTracksRequestSchema,
) {}
