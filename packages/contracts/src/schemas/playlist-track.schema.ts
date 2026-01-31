import { type PlaylistTrack } from "@repo/db";
import z from "zod";

export const PlaylistTrackSchema = z.object({
  id: z.string(),
  order: z.number().int(),
  playlistId: z.string(),
  trackId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
}) satisfies z.ZodType<PlaylistTrack>;

export type ZodPlaylistTrack = z.infer<typeof PlaylistTrackSchema>;
