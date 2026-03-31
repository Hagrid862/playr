import { SetActiveDeviceRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class SetActiveDeviceRequestDto extends createZodDto(SetActiveDeviceRequestSchema) {}
