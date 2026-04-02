import { z } from "zod";

/** `itemId` is the queue row id (`queueId`), not the track id. */
export const MoveQueueItemRequestSchema = z.object({
  itemId: z.uuidv6().describe("Queue item id (queueId)"),
  newPosition: z.number().int().min(0),
  expectedVersion: z.number().int().min(0).default(1),
});

export type MoveQueueItemRequest = z.infer<typeof MoveQueueItemRequestSchema>;
