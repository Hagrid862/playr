import { type Artist } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";

export const ArtistSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isCommunity: z.boolean(),
  verified: z.boolean(),
  bannerId: z.string().nullable(),
  avatarId: z.string().nullable(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  deletedAt: zodDateTimeNullable(),
}) satisfies z.ZodType<Artist>;

export type ZodArtist = z.infer<typeof ArtistSchema>;
