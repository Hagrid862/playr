import { type Artist } from "@repo/db";
import z from "zod";

export const ArtistSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isCommunity: z.boolean(),
  verified: z.boolean(),
  bannerId: z.string().nullable(),
  avatarId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
}) satisfies z.ZodType<Artist>;

export type ZodArtist = z.infer<typeof ArtistSchema>;
