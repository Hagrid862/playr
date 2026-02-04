import { type AccessToken } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";

export const AccessTokenSchema = z.object({
  id: z.string(),
  token: z.string(),
  refreshTokenId: z.string().nullable(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  revokedAt: zodDateTimeNullable(),
  deletedAt: zodDateTimeNullable(),
}) satisfies z.ZodType<AccessToken>;

export type ZodAccessToken = z.infer<typeof AccessTokenSchema>;
