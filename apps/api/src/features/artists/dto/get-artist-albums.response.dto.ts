import { GetArtistAlbumsResponseSchema } from '@repo/contracts';
import { createZodDto } from 'nestjs-zod';

export class GetArtistAlbumsResponseDto extends createZodDto(GetArtistAlbumsResponseSchema) {}
