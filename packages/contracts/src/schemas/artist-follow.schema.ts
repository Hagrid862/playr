import { type ArtistFollow } from "@repo/db";
import z from "zod";
import { zodDateTime } from "../utils/zod-datetime";

export const ArtistFollowSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  artistId: z.string(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
}) satisfies z.ZodType<ArtistFollow>;

export type ZodArtistFollow = z.infer<typeof ArtistFollowSchema>;
