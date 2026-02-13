import { type UserPrivateProfile } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";

export const UserPrivateProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  deletedAt: zodDateTimeNullable(),
}) satisfies z.ZodType<UserPrivateProfile>;

export type ZodUserPrivateProfile = z.infer<typeof UserPrivateProfileSchema>;
