import { UpdateArtistRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateArtistRequestDto extends createZodDto(UpdateArtistRequestSchema) {}
