import { createZodDto } from 'nestjs-zod';
import { ResendEmailVerificationCodeResponseSchema } from '@repo/contracts';

export class ResendEmailVerificationCodeResponseDto extends createZodDto(
  ResendEmailVerificationCodeResponseSchema,
) {}
