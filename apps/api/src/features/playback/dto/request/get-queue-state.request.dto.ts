import { GetQueueStateRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class GetQueueStateRequestDto extends createZodDto(GetQueueStateRequestSchema) {}
