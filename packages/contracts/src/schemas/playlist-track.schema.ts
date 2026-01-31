import { type PlaylistTrack } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";

export const PlaylistTrackSchema = z.object({
  id: z.string(),
  order: z.number().int(),
  playlistId: z.string(),
  trackId: z.string(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  deletedAt: zodDateTimeNullable(),
}) satisfies z.ZodType<PlaylistTrack>;

export type ZodPlaylistTrack = z.infer<typeof PlaylistTrackSchema>;
