import { GetLibraryResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class GetLibraryResponseDto extends createZodDto(GetLibraryResponseSchema) {}
