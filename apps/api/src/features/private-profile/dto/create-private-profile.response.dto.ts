import { CreatePrivateProfileResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreatePrivateProfileResponseDto extends createZodDto(
  CreatePrivateProfileResponseSchema,
) { }
