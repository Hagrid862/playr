import { UpdateLibraryGenreRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateLibraryGenreRequestDto extends createZodDto(UpdateLibraryGenreRequestSchema) {}
