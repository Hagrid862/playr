import { type Library } from "@repo/db";
import z from "zod";

export const LibrarySchema = z.object({
  id: z.string(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
}) satisfies z.ZodType<Library>;

export type ZodLibrary = z.infer<typeof LibrarySchema>;
