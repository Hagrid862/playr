import { SetNextQueueItemRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class SetNextQueueItemRequestDto extends createZodDto(SetNextQueueItemRequestSchema) {}
