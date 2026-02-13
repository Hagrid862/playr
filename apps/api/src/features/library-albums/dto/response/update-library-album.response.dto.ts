import { UpdateAlbumResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateLibraryAlbumResponseDto extends createZodDto(UpdateAlbumResponseSchema) {}
