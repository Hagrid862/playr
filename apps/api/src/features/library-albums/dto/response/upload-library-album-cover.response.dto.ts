import { UploadLibraryAlbumCoverResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class UploadLibraryAlbumCoverResponseDto extends createZodDto(
  UploadLibraryAlbumCoverResponseSchema,
) {}
