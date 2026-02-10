import { type LibraryAlbum } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";
import { AlbumSchema, type ZodAlbum } from "./album.schema";
import { LibrarySchema, type ZodLibrary } from "./library.schema";

export interface ZodLibraryAlbum extends LibraryAlbum {
  library?: ZodLibrary;
  album?: ZodAlbum;
}

export const LibraryAlbumSchema: z.ZodType<ZodLibraryAlbum> = z.object({
  id: z.string(),
  libraryId: z.string(),
  albumId: z.string(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  deletedAt: zodDateTimeNullable(),

  library: z.lazy(() => LibrarySchema).optional(),
  album: z.lazy(() => AlbumSchema).optional(),
});

export type ZodLibraryAlbumInfer = z.infer<typeof LibraryAlbumSchema>;
