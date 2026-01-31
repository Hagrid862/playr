import { createZodDto } from 'nestjs-zod';
import { ApiFailureResponseSchema } from '@repo/contracts';

export class ApiErrorResponseDto extends createZodDto(ApiFailureResponseSchema) {}
