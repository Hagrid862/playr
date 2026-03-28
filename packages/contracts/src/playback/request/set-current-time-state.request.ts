import { z } from "zod";

export const SetCurrentTimeStateRequestSchema = z
  .object({
    currentTime: z.number().min(0).int(),
    expectedVersion: z.number().min(0).int(),
  })
  .strict();

export type SetCurrentTimeStateRequest = z.infer<
  typeof SetCurrentTimeStateRequestSchema
>;
