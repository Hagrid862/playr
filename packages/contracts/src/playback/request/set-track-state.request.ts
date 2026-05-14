import { z } from "zod";
import { PlaybackTrackSchema } from "../../schemas";

export const SetTrackStateRequestSchema = z
  .object({
    track: PlaybackTrackSchema.strict(),
    expectedVersion: z.number().int().min(1),
  })
  .strict();

export type SetTrackStateRequest = z.infer<typeof SetTrackStateRequestSchema>;
