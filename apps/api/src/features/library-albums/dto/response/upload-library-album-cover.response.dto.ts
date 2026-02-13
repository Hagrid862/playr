import { UploadAlbumCoverResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class UploadLibraryAlbumCoverResponseDto extends createZodDto(
  UploadAlbumCoverResponseSchema,
) {}
