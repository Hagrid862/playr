import { UploadLibraryArtistBannerRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class UploadLibraryArtistBannerRequestDto extends createZodDto(
  UploadLibraryArtistBannerRequestSchema,
) {}
