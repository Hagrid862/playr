import { type RefreshToken } from "@repo/db";
import z from "zod";

export const RefreshTokenSchema = z.object({
  id: z.string(),
  token: z.string(),
  sessionId: z.string(),
  accessTokenId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  revokedAt: z.date().nullable(),
  deletedAt: z.date().nullable(),
}) satisfies z.ZodType<RefreshToken>;

export type ZodRefreshToken = z.infer<typeof RefreshTokenSchema>;
