import { type CommunityProfile } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";
import { ArtistSchema, type ZodArtist } from "./artist.schema";
import { ImageSchema, type ZodImage } from "./image.schema";
import { UserSchema, type ZodUser } from "./user.schema";

export interface ZodCommunityProfile extends CommunityProfile {
  user?: ZodUser;
  artist?: ZodArtist | null;
  cover?: ZodImage | null;
  avatar?: ZodImage | null;
}

export const CommunityProfileSchema: z.ZodType<ZodCommunityProfile> = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isVerified: z.boolean(),
  coverId: z.string().nullable(),
  avatarId: z.string().nullable(),
  userId: z.string(),
  artistId: z.string().nullable(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  deletedAt: zodDateTimeNullable(),

  user: z.lazy(() => UserSchema).optional(),
  artist: z.lazy(() => ArtistSchema).optional(),
  cover: z.lazy(() => ImageSchema).optional(),
  avatar: z.lazy(() => ImageSchema).optional(),
});

export type ZodCommunityProfileInfer = z.infer<typeof CommunityProfileSchema>;
