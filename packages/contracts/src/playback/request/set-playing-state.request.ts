import { z } from "zod";

export const SetPlayingStateRequestSchema = z
  .object({
    isPlaying: z.boolean(),
    expectedVersion: z.number().int().min(0),
  })
  .strict();

export type SetPlayingStateRequest = z.infer<
  typeof SetPlayingStateRequestSchema
>;
