import { type LibraryAlbum } from "@repo/db";
import z from "zod";

export const LibraryAlbumSchema = z.object({
  id: z.string(),
  libraryId: z.string(),
  albumId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
}) satisfies z.ZodType<LibraryAlbum>;

export type ZodLibraryAlbum = z.infer<typeof LibraryAlbumSchema>;
