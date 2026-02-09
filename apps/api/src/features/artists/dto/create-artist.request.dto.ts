import { CreateArtistRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateArtistRequestDto extends createZodDto(CreateArtistRequestSchema) { }
