import { z } from "zod";
import { PlaybackTrackSchema } from "../../schemas";

export const SetTrackStateRequestSchema = z
  .object({
    track: PlaybackTrackSchema.strict().required(),
    expectedVersion: z.number().int().min(0).default(0),
  })
  .strict();

export type SetTrackStateRequest = z.infer<typeof SetTrackStateRequestSchema>;
