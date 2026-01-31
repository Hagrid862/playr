import { type LibraryTrack } from "@repo/db";
import z from "zod";

export const LibraryTrackSchema = z.object({
  id: z.string(),
  listenedCount: z.number().int(),
  libraryId: z.string(),
  trackId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  listenCountResetAt: z.date().nullable(),
  deletedAt: z.date().nullable(),
}) satisfies z.ZodType<LibraryTrack>;

export type ZodLibraryTrack = z.infer<typeof LibraryTrackSchema>;
