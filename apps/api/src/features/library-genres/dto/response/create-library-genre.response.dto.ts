import { CreateLibraryGenreResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateLibraryGenreResponseDto extends createZodDto(CreateLibraryGenreResponseSchema) {}
