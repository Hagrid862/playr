import { type LibraryFavorite } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";
import { LibrarySchema, type ZodLibrary } from "./library.schema";
import { TrackSchema, type ZodTrack } from "./track.schema";

export interface ZodLibraryFavorite extends LibraryFavorite {
  library?: ZodLibrary;
  track?: ZodTrack;
}

export const LibraryFavoriteSchema: z.ZodType<ZodLibraryFavorite> = z.object({
  id: z.string(),
  order: z.number().int(),
  libraryId: z.string(),
  trackId: z.string(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  deletedAt: zodDateTimeNullable(),

  library: z.lazy(() => LibrarySchema).optional(),
  track: z.lazy(() => TrackSchema).optional(),
});

export type ZodLibraryFavoriteInfer = z.infer<typeof LibraryFavoriteSchema>;
