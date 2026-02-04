import { type Playlist } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";

export const PlaylistSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isPublic: z.boolean(),
  isCollaborative: z.boolean(),
  libraryId: z.string().nullable(),
  artistId: z.string().nullable(),
  coverId: z.string().nullable(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  deletedAt: zodDateTimeNullable(),
}) satisfies z.ZodType<Playlist>;

export type ZodPlaylist = z.infer<typeof PlaylistSchema>;
