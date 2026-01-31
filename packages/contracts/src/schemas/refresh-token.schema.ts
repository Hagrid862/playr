import { type RefreshToken } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";

export const RefreshTokenSchema = z.object({
  id: z.string(),
  token: z.string(),
  sessionId: z.string(),
  accessTokenId: z.string().nullable(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  revokedAt: zodDateTimeNullable(),
  deletedAt: zodDateTimeNullable(),
}) satisfies z.ZodType<RefreshToken>;

export type ZodRefreshToken = z.infer<typeof RefreshTokenSchema>;
