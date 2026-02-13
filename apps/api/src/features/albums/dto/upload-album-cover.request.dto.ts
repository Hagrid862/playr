import { UploadAlbumCoverRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class UploadAlbumCoverRequestDto extends createZodDto(UploadAlbumCoverRequestSchema) {}
