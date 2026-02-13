import { type UserPrivateProfile } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";
import { UserSchema, type ZodUser } from "./user.schema";

export interface ZodUserPrivateProfile extends UserPrivateProfile {
  user?: ZodUser;
}

export const UserPrivateProfileSchema: z.ZodType<ZodUserPrivateProfile> =
  z.object({
    id: z.string(),
    userId: z.string(),
    createdAt: zodDateTime(),
    updatedAt: zodDateTime(),
    deletedAt: zodDateTimeNullable(),

    user: z.lazy(() => UserSchema).optional(),
  });

export type ZodUserPrivateProfileInfer = z.infer<
  typeof UserPrivateProfileSchema
>;
