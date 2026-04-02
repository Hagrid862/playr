import { z } from "zod";

/** `itemId` is the queue row id (`queueId`), not the track id. */
export const RemoveQueueItemRequestSchema = z.object({
  itemId: z.uuidv6().describe("Queue item id (queueId)"),
  expectedVersion: z.number().int().min(0).default(1),
});

export type RemoveQueueItemRequest = z.infer<
  typeof RemoveQueueItemRequestSchema
>;
