import { z } from "zod";

export const SetVolumeLevelStateRequestSchema = z
  .object({
    volume: z.number().min(0).max(1),
    expectedVersion: z.number().int().min(0).default(0),
  })
  .strict();

export type SetVolumeLevelStateRequest = z.infer<
  typeof SetVolumeLevelStateRequestSchema
>;
