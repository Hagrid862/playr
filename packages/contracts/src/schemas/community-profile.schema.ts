import { type CommunityProfile } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";

export const CommunityProfileSchema = z.object({
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
}) satisfies z.ZodType<CommunityProfile>;

export type ZodCommunityProfile = z.infer<typeof CommunityProfileSchema>;
