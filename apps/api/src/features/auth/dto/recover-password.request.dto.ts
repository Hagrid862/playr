import { createZodDto } from 'nestjs-zod';
import { RecoverPasswordRequestSchema } from '@repo/contracts';

export class RecoverPasswordRequestDto extends createZodDto(RecoverPasswordRequestSchema) {}
