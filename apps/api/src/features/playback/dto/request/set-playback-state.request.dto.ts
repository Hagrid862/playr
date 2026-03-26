import { SetPlaybackStateRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class SetPlaybackStateRequestDto extends createZodDto(SetPlaybackStateRequestSchema) {}
