import { createZodDto } from 'nestjs-zod';
import { GetPlaybackStateResponseSchema } from '@repo/contracts';

export class GetPlaybackStateResponseDto extends createZodDto(GetPlaybackStateResponseSchema) {}
