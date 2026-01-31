import { type ModeratorAccount } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";

export const ModeratorAccountSchema = z.object({
  id: z.string(),
  userId: z.string(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  deletedAt: zodDateTimeNullable(),
}) satisfies z.ZodType<ModeratorAccount>;

export type ZodModeratorAccount = z.infer<typeof ModeratorAccountSchema>;
