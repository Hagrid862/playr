import { type TrackGenre } from "@repo/db";
import z from "zod";
import { zodDateTime } from "../utils/zod-datetime";

export const TrackGenreSchema = z.object({
  id: z.string(),
  trackId: z.string(),
  genreId: z.string(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
}) satisfies z.ZodType<TrackGenre>;

export type ZodTrackGenre = z.infer<typeof TrackGenreSchema>;
