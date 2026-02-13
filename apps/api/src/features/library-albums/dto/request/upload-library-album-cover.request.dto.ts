import { UploadAlbumCoverRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class UploadLibraryAlbumCoverRequestDto extends createZodDto(
  UploadAlbumCoverRequestSchema,
) {}
