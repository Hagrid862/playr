import { SetTrackStateRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class SetTrackStateRequestDto extends createZodDto(SetTrackStateRequestSchema) {}
