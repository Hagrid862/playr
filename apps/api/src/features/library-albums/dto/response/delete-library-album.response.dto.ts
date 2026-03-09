import { createZodDto } from 'nestjs-zod';
import { DeleteLibraryAlbumResponseSchema } from '@repo/contracts';

export class DeleteLibraryAlbumResponseDto extends createZodDto(DeleteLibraryAlbumResponseSchema) {}
