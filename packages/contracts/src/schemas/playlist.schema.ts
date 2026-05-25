import { type Playlist } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";
import { ArtistSchema, type ZodArtist } from "./artist.schema";
import { ImageSchema, type ZodImage } from "./image.schema";
import { LibrarySchema, type ZodLibrary } from "./library.schema";
import {
  PlaylistTrackSchema,
  type ZodPlaylistTrack,
} from "./playlist-track.schema";

export interface ZodPlaylist extends Playlist {
  library?: ZodLibrary | null;
  artist?: ZodArtist | null;
  cover?: ZodImage | null;
  tracks?: ZodPlaylistTrack[];
}

export const PlaylistSystemRoleSchema = z.enum(["favorites"]);

export const PlaylistSchema: z.ZodType<ZodPlaylist> = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isPublic: z.boolean(),
  isCollaborative: z.boolean(),
  systemRole: PlaylistSystemRoleSchema.nullable(),
  libraryId: z.string().nullable(),
  artistId: z.string().nullable(),
  coverId: z.string().nullable(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  deletedAt: zodDateTimeNullable(),

  library: z.lazy(() => LibrarySchema).optional(),
  artist: z.lazy(() => ArtistSchema).optional(),
  cover: z.lazy(() => ImageSchema).optional(),
  tracks: z.array(z.lazy(() => PlaylistTrackSchema)).optional(),
});

export type ZodPlaylistInfer = z.infer<typeof PlaylistSchema>;
