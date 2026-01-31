import { type ModeratorAccount } from "@repo/db";
import z from "zod";

export const ModeratorAccountSchema = z.object({
  id: z.string(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
}) satisfies z.ZodType<ModeratorAccount>;

export type ZodModeratorAccount = z.infer<typeof ModeratorAccountSchema>;
