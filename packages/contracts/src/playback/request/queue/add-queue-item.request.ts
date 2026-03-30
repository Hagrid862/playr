import { z } from "zod";
import { QueueItemSchema } from "../../schemas/playback-track.schema";

export const AddQueueItemRequestSchema = z.object({
  track: QueueItemSchema,
  position: z.number().int().min(0).nullable().default(null),
  expectedVersion: z.number().int().min(0).default(1),
});

export type AddQueueItemRequest = z.infer<typeof AddQueueItemRequestSchema>;
