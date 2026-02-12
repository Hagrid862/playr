import { type Artist, Visibility } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";
import { AlbumSchema, type ZodAlbum } from "./album.schema";
import { ArtistGenreSchema, type ZodArtistGenre } from "./artist-genre.schema";
import {
  ArtistProfileSchema,
  type ZodArtistProfile,
} from "./artist-profile.schema";
import { ImageSchema, type ZodImage } from "./image.schema";
import { TrackSchema, type ZodTrack } from "./track.schema";

export interface ZodArtist extends Artist {
  banner?: ZodImage | null;
  avatar?: ZodImage | null;
  artistProfile?: ZodArtistProfile | null;
  visibility: Visibility;
  albums?: ZodAlbum[];
  tracks?: ZodTrack[];
  genres?: ZodArtistGenre[];
}

export const ArtistSchema: z.ZodType<ZodArtist> = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isCommunity: z.boolean(),
  verified: z.boolean(),
  bannerId: z.string().nullable(),
  avatarId: z.string().nullable(),
  visibility: z.enum(Visibility),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  deletedAt: zodDateTimeNullable(),

  banner: z
    .lazy(() => ImageSchema)
    .nullable()
    .optional(),
  avatar: z
    .lazy(() => ImageSchema)
    .nullable()
    .optional(),
  artistProfile: z.lazy(() => ArtistProfileSchema).optional(),
  albums: z.array(z.lazy(() => AlbumSchema)).optional(),
  tracks: z.array(z.lazy(() => TrackSchema)).optional(),
  genres: z.array(z.lazy(() => ArtistGenreSchema)).optional(),
});

export type ZodArtistInfer = z.infer<typeof ArtistSchema>;
