import { SetQueueRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class SetQueueRequestDto extends createZodDto(SetQueueRequestSchema) {}
