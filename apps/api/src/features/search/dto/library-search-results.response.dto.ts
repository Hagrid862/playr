import { createZodDto } from 'nestjs-zod';
import { LibrarySearchResultsResponseSchema } from '@repo/contracts';

export class LibrarySearchResultsResponseDto extends createZodDto(LibrarySearchResultsResponseSchema) {}
