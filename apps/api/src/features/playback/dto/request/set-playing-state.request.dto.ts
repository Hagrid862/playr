import { SetPlayingStateRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class SetPlayingStateRequestDto extends createZodDto(SetPlayingStateRequestSchema) {}
