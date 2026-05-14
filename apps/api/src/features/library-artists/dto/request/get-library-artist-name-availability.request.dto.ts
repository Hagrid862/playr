import { GetLibraryArtistNameAvailabilityRequestSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class GetLibraryArtistNameAvailabilityRequestDto extends createZodDto(
  GetLibraryArtistNameAvailabilityRequestSchema,
) {}
