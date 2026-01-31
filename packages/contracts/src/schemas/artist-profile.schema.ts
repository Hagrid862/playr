import { type ArtistProfile } from "@repo/db";
import z from "zod";

export const ArtistProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  artistId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
}) satisfies z.ZodType<ArtistProfile>;

export type ZodArtistProfile = z.infer<typeof ArtistProfileSchema>;
