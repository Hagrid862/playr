import { GetLibraryArtistsResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class GetLibraryArtistsResponseDto extends createZodDto(GetLibraryArtistsResponseSchema) {}
