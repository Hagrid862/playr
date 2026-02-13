import { GetAlbumResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class GetAlbumResponseDto extends createZodDto(GetAlbumResponseSchema) {}
