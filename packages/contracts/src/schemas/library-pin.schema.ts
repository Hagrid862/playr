import { type LibraryPin } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";

export const LibraryPinSchema = z.object({
  id: z.string(),
  order: z.number().int(),
  libraryId: z.string(),
  artistId: z.string().nullable(),
  albumId: z.string().nullable(),
  trackId: z.string().nullable(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  deletedAt: zodDateTimeNullable(),
}) satisfies z.ZodType<LibraryPin>;

export type ZodLibraryPin = z.infer<typeof LibraryPinSchema>;
