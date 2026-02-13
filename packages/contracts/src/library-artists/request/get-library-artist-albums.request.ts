import { AlbumType } from "@repo/db";
import { z } from "zod";

export const GetLibraryArtistAlbumsRequestSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(AlbumType).optional(),
});

export type GetLibraryArtistAlbumsRequestDto = z.infer<
  typeof GetLibraryArtistAlbumsRequestSchema
>;
