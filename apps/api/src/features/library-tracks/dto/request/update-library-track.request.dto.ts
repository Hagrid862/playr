import { UpdateLibraryTrackRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateLibraryTrackRequestDto extends createZodDto(UpdateLibraryTrackRequestSchema) {}
