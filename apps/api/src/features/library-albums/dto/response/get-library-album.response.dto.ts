import { GetAlbumResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class GetLibraryAlbumResponseDto extends createZodDto(GetAlbumResponseSchema) {}
