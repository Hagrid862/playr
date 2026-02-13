import { UploadArtistBannerRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class UploadArtistBannerRequestDto extends createZodDto(UploadArtistBannerRequestSchema) {}
