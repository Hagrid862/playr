import { type ListenHistory } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";

export const ListenHistorySchema = z.object({
  id: z.string(),
  listenedAt: zodDateTime(),
  durationMs: z.number().int(),
  completed: z.boolean(),
  userId: z.string(),
  trackId: z.string(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  deletedAt: zodDateTimeNullable(),
}) satisfies z.ZodType<ListenHistory>;

export type ZodListenHistory = z.infer<typeof ListenHistorySchema>;
