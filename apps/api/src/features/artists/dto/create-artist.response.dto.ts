import { CreateArtistResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateArtistResponseDto extends createZodDto(CreateArtistResponseSchema) {}
