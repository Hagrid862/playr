import { createZodDto } from 'nestjs-zod';
import { VerifyEmailResponseSchema } from '@repo/contracts';

export class VerifyEmailResponseDto extends createZodDto(VerifyEmailResponseSchema) {}