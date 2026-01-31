import { type TrackGenre } from "@repo/db";
import z from "zod";

export const TrackGenreSchema = z.object({
  id: z.string(),
  trackId: z.string(),
  genreId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
}) satisfies z.ZodType<TrackGenre>;

export type ZodTrackGenre = z.infer<typeof TrackGenreSchema>;
