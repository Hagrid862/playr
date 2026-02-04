import { type ArtistGenre } from "@repo/db";
import z from "zod";
import { zodDateTime } from "../utils/zod-datetime";

export const ArtistGenreSchema = z.object({
  id: z.string(),
  artistId: z.string(),
  genreId: z.string(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
}) satisfies z.ZodType<ArtistGenre>;

export type ZodArtistGenre = z.infer<typeof ArtistGenreSchema>;
