import { type Track } from "@repo/db";
import z from "zod";

export const TrackSchema = z.object({
  id: z.string(),
  title: z.string(),
  trackNumber: z.number().int(),
  diskNumber: z.number().int(),
  duration: z.number().int(),
  listenedCount: z.number().int(),
  explicit: z.boolean(),
  lyrics: z.string().nullable(),
  albumId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
}) satisfies z.ZodType<Track>;

export type ZodTrack = z.infer<typeof TrackSchema>;
