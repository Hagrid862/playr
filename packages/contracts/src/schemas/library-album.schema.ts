import { type LibraryAlbum } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";

export const LibraryAlbumSchema = z.object({
  id: z.string(),
  libraryId: z.string(),
  albumId: z.string(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  deletedAt: zodDateTimeNullable(),
}) satisfies z.ZodType<LibraryAlbum>;

export type ZodLibraryAlbum = z.infer<typeof LibraryAlbumSchema>;
