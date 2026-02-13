import { UpdateLibraryArtistRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateLibraryArtistRequestDto extends createZodDto(UpdateLibraryArtistRequestSchema) {}
