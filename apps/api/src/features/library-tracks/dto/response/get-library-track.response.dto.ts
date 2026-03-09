import { GetLibraryTrackResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class GetLibraryTrackResponseDto extends createZodDto(GetLibraryTrackResponseSchema) {}
