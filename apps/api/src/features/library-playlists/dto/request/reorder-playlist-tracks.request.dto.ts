import { ReorderPlaylistTracksRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class ReorderPlaylistTracksRequestDto extends createZodDto(
  ReorderPlaylistTracksRequestSchema,
) {}
