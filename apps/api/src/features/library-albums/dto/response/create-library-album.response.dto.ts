import { CreateLibraryAlbumResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateLibraryAlbumResponseDto extends createZodDto(CreateLibraryAlbumResponseSchema) {}
