import { CreateLibraryResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateLibraryResponseDto extends createZodDto(CreateLibraryResponseSchema) {}
