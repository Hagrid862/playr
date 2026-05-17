import { createZodDto } from 'nestjs-zod';
import { LibrarySearchQuerySchema } from '@repo/contracts';

export class LibrarySearchQueryRequestDto extends createZodDto(LibrarySearchQuerySchema) {}
