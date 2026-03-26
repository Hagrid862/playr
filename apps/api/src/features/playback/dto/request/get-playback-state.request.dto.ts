import { GetPlaybackStateRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class GetPlaybackStateRequestDto extends createZodDto(GetPlaybackStateRequestSchema) {}
