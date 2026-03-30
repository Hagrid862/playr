import { ClearQueueRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class ClearQueueRequestDto extends createZodDto(ClearQueueRequestSchema) {}
