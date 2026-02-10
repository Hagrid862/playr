import { type LibraryTrack } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";
import { LibrarySchema, type ZodLibrary } from "./library.schema";
import { TrackSchema, type ZodTrack } from "./track.schema";

export interface ZodLibraryTrack extends LibraryTrack {
  library?: ZodLibrary;
  track?: ZodTrack;
}

export const LibraryTrackSchema: z.ZodType<ZodLibraryTrack> = z.object({
  id: z.string(),
  listenedCount: z.number().int(),
  libraryId: z.string(),
  trackId: z.string(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  listenCountResetAt: zodDateTimeNullable(),
  deletedAt: zodDateTimeNullable(),

  library: z.lazy(() => LibrarySchema).optional(),
  track: z.lazy(() => TrackSchema).optional(),
});

export type ZodLibraryTrackInfer = z.infer<typeof LibraryTrackSchema>;
