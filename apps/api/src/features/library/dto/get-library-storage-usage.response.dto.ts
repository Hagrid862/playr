import { GetLibraryStorageUsageResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class GetLibraryStorageUsageResponseDto extends createZodDto(
  GetLibraryStorageUsageResponseSchema,
) {}
