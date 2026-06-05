import { GetListenHistoryRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class GetListenHistoryRequestDto extends createZodDto(GetListenHistoryRequestSchema) {}
