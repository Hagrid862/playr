import { createZodDto } from 'nestjs-zod';
import { SearchResultsResponseSchema } from '@repo/contracts';

export class SearchResultsResponseDto extends createZodDto(SearchResultsResponseSchema) {}
