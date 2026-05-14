import { z } from "zod";

export const ShuffleQueueRequestSchema = z.object({
  expectedVersion: z.number().int().min(0).default(1),
});

export type ShuffleQueueRequest = z.infer<typeof ShuffleQueueRequestSchema>;
