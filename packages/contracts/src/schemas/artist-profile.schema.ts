import { type ArtistProfile } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";

export const ArtistProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  artistId: z.string().nullable(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  deletedAt: zodDateTimeNullable(),
}) satisfies z.ZodType<ArtistProfile>;

export type ZodArtistProfile = z.infer<typeof ArtistProfileSchema>;
