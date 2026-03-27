import { SetShuffleStateRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class SetShuffleStateRequestDto extends createZodDto(SetShuffleStateRequestSchema) {}
