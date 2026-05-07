import { z } from "zod";

export const GetLibraryAlbumsRequestSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  genreId: z.string().optional(),
});

export type GetLibraryAlbumsRequest = z.infer<
  typeof GetLibraryAlbumsRequestSchema
>;
