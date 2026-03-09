import { CreateLibraryTrackResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateLibraryTrackResponseDto extends createZodDto(CreateLibraryTrackResponseSchema) {}
