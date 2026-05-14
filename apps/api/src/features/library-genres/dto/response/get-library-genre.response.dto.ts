import { GetLibraryGenreResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class GetLibraryGenreResponseDto extends createZodDto(GetLibraryGenreResponseSchema) {}
