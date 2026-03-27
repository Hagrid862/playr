import { SetRepeatStateRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class SetRepeatStateRequestDto extends createZodDto(SetRepeatStateRequestSchema) {}
