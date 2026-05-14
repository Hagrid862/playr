import { SetLibraryStateRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class SetLibraryStateRequestDto extends createZodDto(SetLibraryStateRequestSchema) {}
