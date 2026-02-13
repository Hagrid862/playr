import { GetLibraryAlbumsRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class GetLibraryAlbumsRequestDto extends createZodDto(GetLibraryAlbumsRequestSchema) {}
