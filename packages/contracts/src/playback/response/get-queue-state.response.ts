import { z } from "zod";
import { QueueItemSchema } from "../schemas/playback-track.schema";

export const GetQueueStateResponseSchema = z
  .object({
    items: z.array(QueueItemSchema),
    version: z.number().int().min(0),
  })
  .strict();

export type GetQueueStateResponse = z.infer<typeof GetQueueStateResponseSchema>;
