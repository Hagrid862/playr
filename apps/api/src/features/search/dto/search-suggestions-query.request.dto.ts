import { createZodDto } from 'nestjs-zod';
import { SearchSuggestionsQuerySchema } from '@repo/contracts';

export class SearchSuggestionsQueryRequestDto extends createZodDto(
  SearchSuggestionsQuerySchema,
) {}
