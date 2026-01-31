import { type ArtistFollow } from "@repo/db";
import z from "zod";

export const ArtistFollowSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  artistId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
}) satisfies z.ZodType<ArtistFollow>;

export type ZodArtistFollow = z.infer<typeof ArtistFollowSchema>;
