import { z } from "zod";
import { PlaybackStateSchema } from "../../schemas/playback.schema";

export const SetPlaybackStateRequestSchema = z
  .object({
    state: PlaybackStateSchema.omit({ sessionId: true, userId: true }).strict(),
  })
  .strict();

export type SetPlaybackStateRequest = z.infer<
  typeof SetPlaybackStateRequestSchema
>;
