import { z } from "zod";

export const SetPlayingStateRequestSchema = z
  .object({
    isPlaying: z.boolean(),
    expectedVersion: z.number().int().min(1),
  })
  .strict();

export type SetPlayingStateRequest = z.infer<
  typeof SetPlayingStateRequestSchema
>;
