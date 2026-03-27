import { z } from "zod";

export const SetShuffleStateRequestSchema = z
  .object({
    shuffle: z.boolean(),
    expectedVersion: z.number().int().min(0).default(0),
  })
  .strict();

export type SetShuffleStateRequest = z.infer<
  typeof SetShuffleStateRequestSchema
>;
