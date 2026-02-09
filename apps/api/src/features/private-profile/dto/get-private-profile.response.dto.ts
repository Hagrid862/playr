import { GetPrivateProfileResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class GetPrivateProfileResponseDto extends createZodDto(GetPrivateProfileResponseSchema) { }
