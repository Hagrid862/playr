import { AddPlaylistAlbumRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class AddPlaylistAlbumRequestDto extends createZodDto(AddPlaylistAlbumRequestSchema) {}
