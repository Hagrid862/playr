import { AddQueueItemRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class AddQueueItemRequestDto extends createZodDto(AddQueueItemRequestSchema) {}
