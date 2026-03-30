import { z } from "zod";

export const RemoveQueueItemRequestSchema = z.object({
  itemId: z.uuidv6(),
  expectedVersion: z.number().int().min(0).default(1),
});

export type RemoveQueueItemRequest = z.infer<
  typeof RemoveQueueItemRequestSchema
>;
