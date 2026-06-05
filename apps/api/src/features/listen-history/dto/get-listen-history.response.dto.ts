import { GetListenHistoryResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class GetListenHistoryResponseDto extends createZodDto(GetListenHistoryResponseSchema) {}
