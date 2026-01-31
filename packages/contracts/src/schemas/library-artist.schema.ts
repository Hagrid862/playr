import { type LibraryArtist } from "@repo/db";
import z from "zod";

export const LibraryArtistSchema = z.object({
  id: z.string(),
  libraryId: z.string(),
  artistId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
}) satisfies z.ZodType<LibraryArtist>;

export type ZodLibraryArtist = z.infer<typeof LibraryArtistSchema>;
