import { type Genre } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";
import { AlbumGenreSchema, type ZodAlbumGenre } from "./album-genre.schema";
import { ArtistGenreSchema, type ZodArtistGenre } from "./artist-genre.schema";
import { TrackGenreSchema, type ZodTrackGenre } from "./track-genre.schema";

export interface ZodGenre extends Genre {
  artists?: ZodArtistGenre[];
  albums?: ZodAlbumGenre[];
  tracks?: ZodTrackGenre[];
}

export const GenreSchema: z.ZodType<ZodGenre> = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  deletedAt: zodDateTimeNullable(),

  artists: z.array(z.lazy(() => ArtistGenreSchema)).optional(),
  albums: z.array(z.lazy(() => AlbumGenreSchema)).optional(),
  tracks: z.array(z.lazy(() => TrackGenreSchema)).optional(),
});

export type ZodGenreInfer = z.infer<typeof GenreSchema>;
