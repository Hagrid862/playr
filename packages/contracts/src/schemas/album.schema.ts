import { AlbumType, Visibility, type Album } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";
import { AlbumGenreSchema, type ZodAlbumGenre } from "./album-genre.schema";
import { ArtistSchema, type ZodArtist } from "./artist.schema";
import { ImageSchema, type ZodImage } from "./image.schema";
import { TrackSchema, type ZodTrack } from "./track.schema";

export interface ZodAlbum extends Album {
  cover?: ZodImage | null;
  artists?: ZodArtist[];
  tracks?: ZodTrack[];
  genres?: ZodAlbumGenre[];
  visibility: Visibility;
}

export const AlbumSchema: z.ZodType<ZodAlbum> = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  type: z.enum(AlbumType),
  totalTracks: z.number().int(),
  totalDuration: z.number().int(),
  releaseDate: zodDateTimeNullable(),
  coverId: z.string().nullable(),
  visibility: z.enum(Visibility),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  deletedAt: zodDateTimeNullable(),

  cover: z
    .lazy(() => ImageSchema)
    .nullable()
    .optional(),
  artists: z.array(z.lazy(() => ArtistSchema)).optional(),
  tracks: z.array(z.lazy(() => TrackSchema)).optional(),
  genres: z.array(z.lazy(() => AlbumGenreSchema)).optional(),
});

export type ZodAlbumInfer = z.infer<typeof AlbumSchema>;
