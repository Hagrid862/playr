import { SetVolumeLevelStateRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class SetVolumeLevelStateRequestDto extends createZodDto(SetVolumeLevelStateRequestSchema) {}
