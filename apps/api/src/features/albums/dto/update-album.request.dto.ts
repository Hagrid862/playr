import { UpdateAlbumRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateAlbumRequestDto extends createZodDto(UpdateAlbumRequestSchema) {}
