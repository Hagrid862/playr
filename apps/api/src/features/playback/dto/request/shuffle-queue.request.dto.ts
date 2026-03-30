import { ShuffleQueueRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class ShuffleQueueRequestDto extends createZodDto(ShuffleQueueRequestSchema) {}
