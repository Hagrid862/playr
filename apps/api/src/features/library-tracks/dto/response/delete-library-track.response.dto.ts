import { DeleteLibraryTrackResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class DeleteLibraryTrackResponseDto extends createZodDto(DeleteLibraryTrackResponseSchema) {}
