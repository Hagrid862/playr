import { UpdateLibraryTrackResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateLibraryTrackResponseDto extends createZodDto(UpdateLibraryTrackResponseSchema) {}
