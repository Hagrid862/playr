import { AddPlaylistTrackRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class AddPlaylistTrackRequestDto extends createZodDto(AddPlaylistTrackRequestSchema) {}
