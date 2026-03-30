import { MoveQueueItemRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class MoveQueueItemRequestDto extends createZodDto(MoveQueueItemRequestSchema) {}
