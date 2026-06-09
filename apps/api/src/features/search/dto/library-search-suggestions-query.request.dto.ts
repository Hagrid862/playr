import { createZodDto } from 'nestjs-zod';
import { LibrarySearchSuggestionsQuerySchema } from '@repo/contracts';

export class LibrarySearchSuggestionsQueryRequestDto extends createZodDto(
  LibrarySearchSuggestionsQuerySchema,
) {}
