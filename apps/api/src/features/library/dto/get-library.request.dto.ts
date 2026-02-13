import { GetLibraryRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class GetLibraryRequestDto extends createZodDto(GetLibraryRequestSchema) {}
