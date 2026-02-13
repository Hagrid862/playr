import { CreateLibraryAlbumRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateLibraryAlbumRequestDto extends createZodDto(CreateLibraryAlbumRequestSchema) {}
