import { z } from "zod";

export const SetCurrentTimeStateRequestSchema = z
  .object({
    currentTime: z.number().int().min(0),
    expectedVersion: z.number().int().min(1),
  })
  .strict();

export type SetCurrentTimeStateRequest = z.infer<
  typeof SetCurrentTimeStateRequestSchema
>;
