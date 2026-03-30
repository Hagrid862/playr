import { z } from "zod";
import { QueueItemSchema } from "../../schemas/playback-track.schema";

export const SetQueueRequestSchema = z.object({
  items: z.array(QueueItemSchema),
  expectedVersion: z.number().int().min(0).default(1),
});

export type SetQueueRequest = z.infer<typeof SetQueueRequestSchema>;
