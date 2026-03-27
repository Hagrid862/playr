import { SetCurrentTimeStateRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class SetCurrentTimeStateRequestDto extends createZodDto(SetCurrentTimeStateRequestSchema) {}
