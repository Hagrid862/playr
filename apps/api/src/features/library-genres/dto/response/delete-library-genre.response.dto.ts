import { DeleteLibraryGenreResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class DeleteLibraryGenreResponseDto extends createZodDto(DeleteLibraryGenreResponseSchema) {}
