import { CreateLibraryArtistRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateLibraryArtistRequestDto extends createZodDto(CreateLibraryArtistRequestSchema) {}
