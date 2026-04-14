import { CreateLibraryGenreRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateLibraryGenreRequestDto extends createZodDto(CreateLibraryGenreRequestSchema) {}
