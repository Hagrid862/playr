import { PinPlaylistRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class PinPlaylistRequestDto extends createZodDto(PinPlaylistRequestSchema) {}
