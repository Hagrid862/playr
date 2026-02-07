import { RefreshResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class RefreshResponseDto extends createZodDto(RefreshResponseSchema) {}
