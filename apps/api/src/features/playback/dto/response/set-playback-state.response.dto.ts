import { SetPlaybackStateResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class SetPlaybackStateResponseDto extends createZodDto(SetPlaybackStateResponseSchema) {}
