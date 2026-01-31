import { type Playlist } from "@repo/db";
import z from "zod";

export const PlaylistSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isPublic: z.boolean(),
  isCollaborative: z.boolean(),
  libraryId: z.string().nullable(),
  artistId: z.string().nullable(),
  coverId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
}) satisfies z.ZodType<Playlist>;

export type ZodPlaylist = z.infer<typeof PlaylistSchema>;
