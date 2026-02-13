import { UploadLibraryAlbumCoverRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class UploadLibraryAlbumCoverRequestDto extends createZodDto(
  UploadLibraryAlbumCoverRequestSchema,
) {}
