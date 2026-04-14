import { GetLibraryGenresResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class GetLibraryGenresResponseDto extends createZodDto(GetLibraryGenresResponseSchema) {}
