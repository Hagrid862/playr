import { UploadLibraryArtistAvatarResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class UploadLibraryArtistAvatarResponseDto extends createZodDto(
  UploadLibraryArtistAvatarResponseSchema,
) {}
