import { UpdateLibraryAlbumRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateLibraryAlbumRequestDto extends createZodDto(UpdateLibraryAlbumRequestSchema) {}
