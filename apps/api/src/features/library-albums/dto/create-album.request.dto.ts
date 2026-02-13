import { CreateAlbumRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateAlbumRequestDto extends createZodDto(CreateAlbumRequestSchema) {}
