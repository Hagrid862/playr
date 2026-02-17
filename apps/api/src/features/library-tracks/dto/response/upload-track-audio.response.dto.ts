import { UploadTrackAudioResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class UploadTrackAudioResponseDto extends createZodDto(UploadTrackAudioResponseSchema) {}
