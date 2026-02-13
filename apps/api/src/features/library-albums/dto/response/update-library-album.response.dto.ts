import { UpdateLibraryAlbumResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateLibraryAlbumResponseDto extends createZodDto(UpdateLibraryAlbumResponseSchema) {}
