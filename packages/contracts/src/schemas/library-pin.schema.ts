import { type LibraryPin } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";
import { AlbumSchema, type ZodAlbum } from "./album.schema";
import { ArtistSchema, type ZodArtist } from "./artist.schema";
import { LibrarySchema, type ZodLibrary } from "./library.schema";
import { TrackSchema, type ZodTrack } from "./track.schema";

export interface ZodLibraryPin extends LibraryPin {
  library?: ZodLibrary;
  artist?: ZodArtist | null;
  album?: ZodAlbum | null;
  track?: ZodTrack | null;
}

export const LibraryPinSchema: z.ZodType<ZodLibraryPin> = z.object({
  id: z.string(),
  order: z.number().int(),
  libraryId: z.string(),
  artistId: z.string().nullable(),
  albumId: z.string().nullable(),
  trackId: z.string().nullable(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  deletedAt: zodDateTimeNullable(),

  library: z.lazy(() => LibrarySchema).optional(),
  artist: z.lazy(() => ArtistSchema).optional(),
  album: z.lazy(() => AlbumSchema).optional(),
  track: z.lazy(() => TrackSchema).optional(),
});

export type ZodLibraryPinInfer = z.infer<typeof LibraryPinSchema>;
