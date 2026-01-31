import { type Genre } from "@repo/db";
import z from "zod";

export const GenreSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
}) satisfies z.ZodType<Genre>;

export type ZodGenre = z.infer<typeof GenreSchema>;
