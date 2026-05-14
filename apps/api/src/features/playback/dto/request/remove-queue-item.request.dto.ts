import { RemoveQueueItemRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class RemoveQueueItemRequestDto extends createZodDto(RemoveQueueItemRequestSchema) {}
