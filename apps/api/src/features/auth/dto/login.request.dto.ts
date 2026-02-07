import { createZodDto } from 'nestjs-zod';
import { LoginRequestSchema } from '@repo/contracts';

export class LoginRequestDto extends createZodDto(LoginRequestSchema) {}
