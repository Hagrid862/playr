import { DeleteLibraryAlbumQuerySchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class DeleteLibraryAlbumQueryDto extends createZodDto(DeleteLibraryAlbumQuerySchema) {}
