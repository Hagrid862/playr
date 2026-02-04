import { type Track } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";

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
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  deletedAt: zodDateTimeNullable(),
}) satisfies z.ZodType<Track>;

export type ZodTrack = z.infer<typeof TrackSchema>;
