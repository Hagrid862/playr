import { createZodDto } from 'nestjs-zod';
import { SearchSuggestionsResultsSchema } from '@repo/contracts';

export class SearchSuggestionsResultsResponseDto extends createZodDto(SearchSuggestionsResultsSchema) {}
