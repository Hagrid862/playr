import { UploadArtistBannerResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class UploadArtistBannerResponseDto extends createZodDto(UploadArtistBannerResponseSchema) {}
