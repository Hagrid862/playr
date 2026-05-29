import { Gender, type User } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils";
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

export interface ZodUser extends Omit<User, "password" | "storageQuotaBytes"> {
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

export const UserWithPrimaryEmailSchema = UserSchema.transform((user, ctx) => {
  const primaryEmails =
    user.emailAddresses?.filter((email) => email.type === "primary") ?? [];

  if (primaryEmails.length === 0) {
    ctx.addIssue({
      code: "custom",
      message: "At least one primary email address is required",
      path: ["emailAddresses"],
    });
    return z.NEVER;
  }

  return {
    ...user,
    emailAddresses: primaryEmails,
  } as ZodUser & { emailAddresses: [ZodEmailAddress, ...ZodEmailAddress[]] };
});

export type ZodUserWithPrimaryEmail = z.infer<
  typeof UserWithPrimaryEmailSchema
>;

export type ZodUserInfer = z.infer<typeof UserSchema>;
