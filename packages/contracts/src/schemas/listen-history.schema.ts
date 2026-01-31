import { type ListenHistory } from "@repo/db";
import z from "zod";

export const ListenHistorySchema = z.object({
  id: z.string(),
  listenedAt: z.date(),
  durationMs: z.number().int(),
  completed: z.boolean(),
  userId: z.string(),
  trackId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
}) satisfies z.ZodType<ListenHistory>;

export type ZodListenHistory = z.infer<typeof ListenHistorySchema>;
