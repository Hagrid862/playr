import { GetLibraryArtistsRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class GetLibraryArtistsRequestDto extends createZodDto(GetLibraryArtistsRequestSchema) {}
