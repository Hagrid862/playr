import { UploadLibraryArtistAvatarRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class UploadLibraryArtistAvatarRequestDto extends createZodDto(
  UploadLibraryArtistAvatarRequestSchema,
) {}
