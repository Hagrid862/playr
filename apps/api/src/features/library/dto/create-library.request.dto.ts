import { CreateLibraryRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateLibraryRequestDto extends createZodDto(CreateLibraryRequestSchema) {}
