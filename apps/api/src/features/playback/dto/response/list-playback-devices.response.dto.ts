import { ListPlaybackDevicesResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class ListPlaybackDevicesResponseDto extends createZodDto(
  ListPlaybackDevicesResponseSchema,
) {}
