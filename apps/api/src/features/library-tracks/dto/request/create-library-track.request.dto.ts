import { CreateLibraryTrackRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateLibraryTrackRequestDto extends createZodDto(CreateLibraryTrackRequestSchema) {}
