import { GetLibraryGenresRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class GetLibraryGenresRequestDto extends createZodDto(GetLibraryGenresRequestSchema) {}
