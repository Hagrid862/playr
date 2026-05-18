import { CreateLibraryPlaylistRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateLibraryPlaylistRequestDto extends createZodDto(CreateLibraryPlaylistRequestSchema) {}
