import { UpdateLibraryGenreResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateLibraryGenreResponseDto extends createZodDto(UpdateLibraryGenreResponseSchema) {}
