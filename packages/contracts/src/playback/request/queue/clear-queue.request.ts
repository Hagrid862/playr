import { z } from "zod";

export const ClearQueueRequestSchema = z.object({
  expectedVersion: z.number().int().min(0).default(1),
});

export type ClearQueueRequest = z.infer<typeof ClearQueueRequestSchema>;
