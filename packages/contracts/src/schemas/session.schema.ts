import { SessionType, type Session } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";

export const SessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum(SessionType),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  expiresAt: zodDateTimeNullable(),
  refreshedAt: zodDateTimeNullable(),
  revokedAt: zodDateTimeNullable(),
  deletedAt: zodDateTimeNullable(),
}) satisfies z.ZodType<Session>;

export type ZodSession = z.infer<typeof SessionSchema>;
