import { SortPlaylistTracksRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class SortPlaylistTracksRequestDto extends createZodDto(SortPlaylistTracksRequestSchema) {}
