import { Gender, type User } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";
import {
  ArtistProfileSchema,
  type ZodArtistProfile,
} from "./artist-profile.schema";
import {
  CommunityProfileSchema,
  type ZodCommunityProfile,
} from "./community-profile.schema";
import {
  EmailAddressSchema,
  type ZodEmailAddress,
} from "./email-address.schema";
import { ImageSchema, type ZodImage } from "./image.schema";
import { LibrarySchema, type ZodLibrary } from "./library.schema";

export interface ZodUser extends Omit<User, "password"> {
  library?: ZodLibrary | null;
  avatar?: ZodImage | null;
  artistProfile?: ZodArtistProfile | null;
  communityProfile?: ZodCommunityProfile | null;
  emailAddresses?: ZodEmailAddress[];
}

export const UserSchema: z.ZodType<ZodUser> = z.object({
  id: z.string(),
  username: z.string(),
  firstName: z.string(),
  lastName: z.string().nullable(),
  birthDate: z.string().nullable(),
  gender: z.enum(Gender).nullable(),
  description: z.string().nullable(),
  avatarId: z.string().nullable(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  deletedAt: zodDateTimeNullable(),

  library: z.lazy(() => LibrarySchema).optional(),
  avatar: z.lazy(() => ImageSchema).optional(),
  artistProfile: z.lazy(() => ArtistProfileSchema).optional(),
  communityProfile: z.lazy(() => CommunityProfileSchema).optional(),
  emailAddresses: z.array(z.lazy(() => EmailAddressSchema)).optional(),
});

export type ZodUserInfer = z.infer<typeof UserSchema>;
