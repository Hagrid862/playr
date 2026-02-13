import { type Library } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";
import {
  LibraryAlbumSchema,
  type ZodLibraryAlbum,
} from "./library-album.schema";
import {
  LibraryArtistSchema,
  type ZodLibraryArtist,
} from "./library-artist.schema";
import {
  LibraryFavoriteSchema,
  type ZodLibraryFavorite,
} from "./library-favorite.schema";
import { LibraryPinSchema, type ZodLibraryPin } from "./library-pin.schema";
import {
  LibraryTrackSchema,
  type ZodLibraryTrack,
} from "./library-track.schema";
import { PlaylistSchema, type ZodPlaylist } from "./playlist.schema";
import { UserSchema, type ZodUser } from "./user.schema";

export interface ZodLibrary extends Library {
  user?: ZodUser | null;
  artists?: ZodLibraryArtist[];
  albums?: ZodLibraryAlbum[];
  tracks?: ZodLibraryTrack[];
  playlists?: ZodPlaylist[];
  pins?: ZodLibraryPin[];
  favorites?: ZodLibraryFavorite[];
}

export const LibrarySchema: z.ZodType<ZodLibrary> = z.object({
  id: z.string(),
  userId: z.string(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  deletedAt: zodDateTimeNullable(),

  user: z.lazy(() => UserSchema).optional(),
  artists: z.array(z.lazy(() => LibraryArtistSchema)).optional(),
  albums: z.array(z.lazy(() => LibraryAlbumSchema)).optional(),
  tracks: z.array(z.lazy(() => LibraryTrackSchema)).optional(),
  playlists: z.array(z.lazy(() => PlaylistSchema)).optional(),
  pins: z.array(z.lazy(() => LibraryPinSchema)).optional(),
  favorites: z.array(z.lazy(() => LibraryFavoriteSchema)).optional(),
});

export type ZodLibraryInfer = z.infer<typeof LibrarySchema>;
