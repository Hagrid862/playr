import { GetLibraryArtistNameAvailabilityResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class GetLibraryArtistNameAvailabilityResponseDto extends createZodDto(
  GetLibraryArtistNameAvailabilityResponseSchema,
) {}
