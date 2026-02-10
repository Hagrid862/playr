import { type PlaylistTrack } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";
import { PlaylistSchema, type ZodPlaylist } from "./playlist.schema";
import { TrackSchema, type ZodTrack } from "./track.schema";

export interface ZodPlaylistTrack extends PlaylistTrack {
  playlist?: ZodPlaylist;
  track?: ZodTrack;
}

export const PlaylistTrackSchema: z.ZodType<ZodPlaylistTrack> = z.object({
  id: z.string(),
  order: z.number().int(),
  playlistId: z.string(),
  trackId: z.string(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  deletedAt: zodDateTimeNullable(),

  playlist: z.lazy(() => PlaylistSchema).optional(),
  track: z.lazy(() => TrackSchema).optional(),
});

export type ZodPlaylistTrackInfer = z.infer<typeof PlaylistTrackSchema>;
