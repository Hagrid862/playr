import { z } from "zod";

export const GetLibraryArtistsRequestSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type GetLibraryArtistsRequestDto = z.infer<
  typeof GetLibraryArtistsRequestSchema
>;
