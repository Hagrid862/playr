import { createZodDto } from 'nestjs-zod';
import { LoginResponseSchema } from '@repo/contracts';

export class LoginResponseDto extends createZodDto(LoginResponseSchema) {}
