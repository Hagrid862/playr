import { UpdateAlbumResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateAlbumResponseDto extends createZodDto(UpdateAlbumResponseSchema) {}
