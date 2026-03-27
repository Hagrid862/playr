import { SetFavoriteStateRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class SetFavoriteStateRequestDto extends createZodDto(SetFavoriteStateRequestSchema) {}
