import { GetLibraryTracksResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class GetLibraryTracksResponseDto extends createZodDto(GetLibraryTracksResponseSchema) {}
