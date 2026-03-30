import { z } from "zod";

export const MoveQueueItemRequestSchema = z.object({
  itemId: z.uuidv6(),
  newPosition: z.number().int().min(0),
  expectedVersion: z.number().int().min(0).default(1),
});

export type MoveQueueItemRequest = z.infer<typeof MoveQueueItemRequestSchema>;
