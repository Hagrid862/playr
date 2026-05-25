import { ReorderPlaylistPinsRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class ReorderPlaylistPinsRequestDto extends createZodDto(ReorderPlaylistPinsRequestSchema) {}
