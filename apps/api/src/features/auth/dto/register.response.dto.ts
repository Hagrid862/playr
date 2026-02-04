import { createZodDto } from 'nestjs-zod';
import { RegisterResponseSchema } from '@repo/contracts';

export class RegisterResponseDto extends createZodDto(RegisterResponseSchema) {}
