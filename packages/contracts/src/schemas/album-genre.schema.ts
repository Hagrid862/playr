import { type AlbumGenre } from "@repo/db";
import z from "zod";
import { zodDateTime } from "../utils/zod-datetime";

export const AlbumGenreSchema = z.object({
  id: z.string(),
  albumId: z.string(),
  genreId: z.string(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
}) satisfies z.ZodType<AlbumGenre>;

export type ZodAlbumGenre = z.infer<typeof AlbumGenreSchema>;
