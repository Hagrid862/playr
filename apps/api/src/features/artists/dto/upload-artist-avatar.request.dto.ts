import { UploadArtistAvatarRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class UploadArtistAvatarRequestDto extends createZodDto(UploadArtistAvatarRequestSchema) {}
