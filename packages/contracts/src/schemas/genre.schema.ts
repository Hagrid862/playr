import { type Genre } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";

export const GenreSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  deletedAt: zodDateTimeNullable(),
}) satisfies z.ZodType<Genre>;

export type ZodGenre = z.infer<typeof GenreSchema>;
