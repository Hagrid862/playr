import { UpdateArtistResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class UpdateArtistResponseDto extends createZodDto(UpdateArtistResponseSchema) {}
