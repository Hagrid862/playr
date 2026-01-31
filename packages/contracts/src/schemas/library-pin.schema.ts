import { type LibraryPin } from "@repo/db";
import z from "zod";

export const LibraryPinSchema = z.object({
  id: z.string(),
  order: z.number().int(),
  libraryId: z.string(),
  artistId: z.string().nullable(),
  albumId: z.string().nullable(),
  trackId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
}) satisfies z.ZodType<LibraryPin>;

export type ZodLibraryPin = z.infer<typeof LibraryPinSchema>;
