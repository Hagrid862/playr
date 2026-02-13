import { type TrackGenre } from "@repo/db";
import z from "zod";
import { zodDateTime } from "../utils/zod-datetime";
import { GenreSchema, type ZodGenre } from "./genre.schema";
import { TrackSchema, type ZodTrack } from "./track.schema";

export interface ZodTrackGenre extends TrackGenre {
  track?: ZodTrack;
  genre?: ZodGenre;
}

export const TrackGenreSchema: z.ZodType<ZodTrackGenre> = z.object({
  id: z.string(),
  trackId: z.string(),
  genreId: z.string(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),

  track: z.lazy(() => TrackSchema).optional(),
  genre: z.lazy(() => GenreSchema).optional(),
});

export type ZodTrackGenreInfer = z.infer<typeof TrackGenreSchema>;
