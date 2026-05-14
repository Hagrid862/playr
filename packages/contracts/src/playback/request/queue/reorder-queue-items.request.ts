import { z } from "zod";
import { QueueItemSchema } from "../../schemas/playback-track.schema";

export const ReorderQueueItemsRequestSchema = z.object({
  items: z.array(QueueItemSchema),
  expectedVersion: z.number().int().min(0).default(1),
});

export type ReorderQueueItemsRequest = z.infer<
  typeof ReorderQueueItemsRequestSchema
>;
