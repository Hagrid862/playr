import { type AlbumGenre } from "@repo/db";
import z from "zod";

export const AlbumGenreSchema = z.object({
  id: z.string(),
  albumId: z.string(),
  genreId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
}) satisfies z.ZodType<AlbumGenre>;

export type ZodAlbumGenre = z.infer<typeof AlbumGenreSchema>;
