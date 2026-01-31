import { type LibraryFavorite } from "@repo/db";
import z from "zod";

export const LibraryFavoriteSchema = z.object({
  id: z.string(),
  order: z.number().int(),
  libraryId: z.string(),
  trackId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
}) satisfies z.ZodType<LibraryFavorite>;

export type ZodLibraryFavorite = z.infer<typeof LibraryFavoriteSchema>;
