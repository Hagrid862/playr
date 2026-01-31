import { type LibraryArtist } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";

export const LibraryArtistSchema = z.object({
  id: z.string(),
  libraryId: z.string(),
  artistId: z.string(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  deletedAt: zodDateTimeNullable(),
}) satisfies z.ZodType<LibraryArtist>;

export type ZodLibraryArtist = z.infer<typeof LibraryArtistSchema>;
