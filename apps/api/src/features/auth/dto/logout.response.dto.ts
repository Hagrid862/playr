import { LogoutResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class LogoutResponseDto extends createZodDto(LogoutResponseSchema) {}
