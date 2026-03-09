import { GetLibraryTracksRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class GetLibraryTracksRequestDto extends createZodDto(GetLibraryTracksRequestSchema) {}
