import { createZodDto } from 'nestjs-zod';
import { RegisterRequestSchema } from '@repo/contracts';

export class RegisterRequestDto extends createZodDto(RegisterRequestSchema) {}
