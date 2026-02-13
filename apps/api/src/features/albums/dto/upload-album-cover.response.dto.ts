import { UploadAlbumCoverResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class UploadAlbumCoverResponseDto extends createZodDto(UploadAlbumCoverResponseSchema) {}
