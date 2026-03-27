import { z } from "zod";

export const SetCurrentTimeStateRequestSchema = z
  .object({
    currentTime: z.number().min(0).int(),
    expectedVersion: z.number().int().min(0).default(0),
  })
  .strict();

export type SetCurrentTimeStateRequest = z.infer<
  typeof SetCurrentTimeStateRequestSchema
>;
