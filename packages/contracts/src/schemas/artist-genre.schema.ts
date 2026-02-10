import { type ArtistGenre } from "@repo/db";
import z from "zod";
import { zodDateTime } from "../utils/zod-datetime";
import { ArtistSchema, type ZodArtist } from "./artist.schema";
import { GenreSchema, type ZodGenre } from "./genre.schema";

export interface ZodArtistGenre extends ArtistGenre {
  artist?: ZodArtist;
  genre?: ZodGenre;
}

export const ArtistGenreSchema: z.ZodType<ZodArtistGenre> = z.object({
  id: z.string(),
  artistId: z.string(),
  genreId: z.string(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),

  artist: z.lazy(() => ArtistSchema).optional(),
  genre: z.lazy(() => GenreSchema).optional(),
});

export type ZodArtistGenreInfer = z.infer<typeof ArtistGenreSchema>;
