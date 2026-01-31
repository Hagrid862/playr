import { type LibraryTrack } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";

export const LibraryTrackSchema = z.object({
  id: z.string(),
  listenedCount: z.number().int(),
  libraryId: z.string(),
  trackId: z.string(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  listenCountResetAt: zodDateTimeNullable(),
  deletedAt: zodDateTimeNullable(),
}) satisfies z.ZodType<LibraryTrack>;

export type ZodLibraryTrack = z.infer<typeof LibraryTrackSchema>;
