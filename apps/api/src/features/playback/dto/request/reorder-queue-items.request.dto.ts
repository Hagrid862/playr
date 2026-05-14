import { ReorderQueueItemsRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class ReorderQueueItemsRequestDto extends createZodDto(ReorderQueueItemsRequestSchema) {}
