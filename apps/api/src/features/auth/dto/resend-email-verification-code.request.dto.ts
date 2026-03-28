import { createZodDto } from 'nestjs-zod';
import { ResendEmailVerificationCodeRequestSchema } from '@repo/contracts';

export class ResendEmailVerificationCodeRequestDto extends createZodDto(
  ResendEmailVerificationCodeRequestSchema,
) {}

