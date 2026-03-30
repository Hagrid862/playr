import { GetQueueStateResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class GetQueueStateResponseDto extends createZodDto(GetQueueStateResponseSchema) {}
