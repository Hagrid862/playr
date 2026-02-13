import { type PrivateArtistProfile } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";
import { ArtistSchema, type ZodArtist } from "./artist.schema";
import {
  UserPrivateProfileSchema,
  type ZodUserPrivateProfile,
} from "./user-private-profile.schema";

export interface ZodPrivateArtistProfile extends PrivateArtistProfile {
  userPrivateProfile?: ZodUserPrivateProfile;
  artist?: ZodArtist;
}

export const PrivateArtistProfileSchema: z.ZodType<ZodPrivateArtistProfile> =
  z.object({
    id: z.string(),
    userPrivateProfileId: z.string(),
    artistId: z.string(),
    createdAt: zodDateTime(),
    updatedAt: zodDateTime(),
    deletedAt: zodDateTimeNullable(),

    userPrivateProfile: z.lazy(() => UserPrivateProfileSchema).optional(),
    artist: z.lazy(() => ArtistSchema).optional(),
  });

export type ZodPrivateArtistProfileInfer = z.infer<
  typeof PrivateArtistProfileSchema
>;
