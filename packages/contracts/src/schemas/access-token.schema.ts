import { type AccessToken } from "@repo/db";
import z from "zod";

export const AccessTokenSchema = z.object({
  id: z.string(),
  token: z.string(),
  refreshTokenId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  revokedAt: z.date().nullable(),
  deletedAt: z.date().nullable(),
}) satisfies z.ZodType<AccessToken>;

export type ZodAccessToken = z.infer<typeof AccessTokenSchema>;
