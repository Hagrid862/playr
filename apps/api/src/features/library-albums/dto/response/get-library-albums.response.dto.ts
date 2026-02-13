import { GetLibraryAlbumsResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class GetLibraryAlbumsResponseDto extends createZodDto(GetLibraryAlbumsResponseSchema) {}
