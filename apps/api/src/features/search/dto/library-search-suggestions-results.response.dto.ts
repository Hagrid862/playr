import { createZodDto } from 'nestjs-zod';
import { LibrarySearchSuggestionsResultsSchema } from '@repo/contracts';

export class LibrarySearchSuggestionsResultsResponseDto extends createZodDto(
  LibrarySearchSuggestionsResultsSchema,
) {}
