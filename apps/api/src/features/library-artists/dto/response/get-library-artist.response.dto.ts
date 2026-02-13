import { GetLibraryArtistResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class GetLibraryArtistResponseDto extends createZodDto(GetLibraryArtistResponseSchema) {}
