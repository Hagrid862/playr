import { CreateAlbumResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateAlbumResponseDto extends createZodDto(CreateAlbumResponseSchema) {}
