import { type Library } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";

export const LibrarySchema = z.object({
  id: z.string(),
  userId: z.string(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  deletedAt: zodDateTimeNullable(),
}) satisfies z.ZodType<Library>;

export type ZodLibrary = z.infer<typeof LibrarySchema>;
