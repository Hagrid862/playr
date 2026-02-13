import { type AlbumGenre } from "@repo/db";
import z from "zod";
import { zodDateTime } from "../utils/zod-datetime";
import { AlbumSchema, type ZodAlbum } from "./album.schema";
import { GenreSchema, type ZodGenre } from "./genre.schema";

export interface ZodAlbumGenre extends AlbumGenre {
  album?: ZodAlbum;
  genre?: ZodGenre;
}

export const AlbumGenreSchema: z.ZodType<ZodAlbumGenre> = z.object({
  id: z.string(),
  albumId: z.string(),
  genreId: z.string(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),

  album: z.lazy(() => AlbumSchema).optional(),
  genre: z.lazy(() => GenreSchema).optional(),
});

export type ZodAlbumGenreInfer = z.infer<typeof AlbumGenreSchema>;
