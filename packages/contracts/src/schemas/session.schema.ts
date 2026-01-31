import { SessionType, type Session } from "@repo/db";
import z from "zod";

export const SessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum(SessionType),
  createdAt: z.date(),
  updatedAt: z.date(),
  expiresAt: z.date().nullable(),
  refreshedAt: z.date().nullable(),
  revokedAt: z.date().nullable(),
  deletedAt: z.date().nullable(),
}) satisfies z.ZodType<Session>;

export type ZodSession = z.infer<typeof SessionSchema>;
