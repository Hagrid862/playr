import { type PrivateArtistProfile } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";

export const PrivateArtistProfileSchema = z.object({
  id: z.string(),
  userPrivateProfileId: z.string(),
  artistId: z.string(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  deletedAt: zodDateTimeNullable(),
}) satisfies z.ZodType<PrivateArtistProfile>;

export type ZodPrivateArtistProfile = z.infer<
  typeof PrivateArtistProfileSchema
>;
