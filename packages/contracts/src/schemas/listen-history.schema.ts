import { type ListenHistory } from "@repo/db";
import z from "zod";
import { zodDateTime } from "../utils/zod-datetime";

export const ListenHistorySchema = z.object({
  id: z.string(),
  listenedAt: zodDateTime(),
  completed: z.boolean(),
  userId: z.string(),
  trackId: z.string(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
}) satisfies z.ZodType<ListenHistory>;

export type ZodListenHistory = z.infer<typeof ListenHistorySchema>;
