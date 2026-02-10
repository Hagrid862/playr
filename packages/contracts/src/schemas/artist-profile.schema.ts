import { type ArtistProfile } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";
import { ArtistSchema, type ZodArtist } from "./artist.schema";
import { UserSchema, type ZodUser } from "./user.schema";

export interface ZodArtistProfile extends ArtistProfile {
  user?: ZodUser;
  artist?: ZodArtist | null;
}

export const ArtistProfileSchema: z.ZodType<ZodArtistProfile> = z.object({
  id: z.string(),
  userId: z.string(),
  artistId: z.string().nullable(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  deletedAt: zodDateTimeNullable(),

  user: z.lazy(() => UserSchema).optional(),
  artist: z.lazy(() => ArtistSchema).optional(),
});

export type ZodArtistProfileInfer = z.infer<typeof ArtistProfileSchema>;
