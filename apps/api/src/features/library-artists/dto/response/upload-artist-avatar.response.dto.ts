import { UploadArtistAvatarResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class UploadArtistAvatarResponseDto extends createZodDto(UploadArtistAvatarResponseSchema) {}
