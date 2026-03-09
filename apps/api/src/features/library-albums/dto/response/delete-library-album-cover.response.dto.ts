import { createZodDto } from 'nestjs-zod';
import { DeleteLibraryAlbumCoverResponseSchema } from '@repo/contracts';

export class DeleteLibraryAlbumCoverResponseDto extends createZodDto(
  DeleteLibraryAlbumCoverResponseSchema,
) {}
