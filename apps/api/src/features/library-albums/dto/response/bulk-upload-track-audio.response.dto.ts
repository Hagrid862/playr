import { BulkUploadTrackAudioResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class BulkUploadTrackAudioResponseDto extends createZodDto(
  BulkUploadTrackAudioResponseSchema,
) {}
