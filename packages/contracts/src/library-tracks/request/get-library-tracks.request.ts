import { z } from "zod";

export const GetLibraryTracksRequestSchema = z.object({
  albumId: z.string().optional(),
  genreId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type GetLibraryTracksRequest = z.infer<
  typeof GetLibraryTracksRequestSchema
>;
