import { type ArtistGenre } from "@repo/db";
import z from "zod";

export const ArtistGenreSchema = z.object({
  id: z.string(),
  artistId: z.string(),
  genreId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
}) satisfies z.ZodType<ArtistGenre>;

export type ZodArtistGenre = z.infer<typeof ArtistGenreSchema>;
