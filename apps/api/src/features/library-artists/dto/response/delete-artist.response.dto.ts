import { DeleteArtistResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class DeleteArtistResponseDto extends createZodDto(DeleteArtistResponseSchema) {}
