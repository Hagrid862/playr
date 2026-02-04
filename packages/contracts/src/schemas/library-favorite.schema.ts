import { type LibraryFavorite } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";

export const LibraryFavoriteSchema = z.object({
  id: z.string(),
  order: z.number().int(),
  libraryId: z.string(),
  trackId: z.string(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  deletedAt: zodDateTimeNullable(),
}) satisfies z.ZodType<LibraryFavorite>;

export type ZodLibraryFavorite = z.infer<typeof LibraryFavoriteSchema>;
