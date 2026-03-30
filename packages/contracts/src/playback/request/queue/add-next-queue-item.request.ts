import { z } from "zod";
import { QueueItemSchema } from "../../schemas/playback-track.schema";

export const SetNextQueueItemRequestSchema = z.object({
  track: QueueItemSchema,
  expectedVersion: z.number().int().min(0).default(1),
});

export type SetNextQueueItemRequest = z.infer<
  typeof SetNextQueueItemRequestSchema
>;
