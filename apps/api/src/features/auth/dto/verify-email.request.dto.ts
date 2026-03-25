import { createZodDto } from 'nestjs-zod';
import { VerifyEmailRequestSchema } from '@repo/contracts';

export class VerifyEmailRequestDto extends createZodDto(VerifyEmailRequestSchema) {}