import { type LibraryArtist } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";
import { ArtistSchema, type ZodArtist } from "./artist.schema";
import { LibrarySchema, type ZodLibrary } from "./library.schema";

export interface ZodLibraryArtist extends LibraryArtist {
  library?: ZodLibrary;
  artist?: ZodArtist;
}

export const LibraryArtistSchema: z.ZodType<ZodLibraryArtist> = z.object({
  id: z.string(),
  libraryId: z.string(),
  artistId: z.string(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  deletedAt: zodDateTimeNullable(),

  library: z.lazy(() => LibrarySchema).optional(),
  artist: z.lazy(() => ArtistSchema).optional(),
});

export type ZodLibraryArtistInfer = z.infer<typeof LibraryArtistSchema>;
