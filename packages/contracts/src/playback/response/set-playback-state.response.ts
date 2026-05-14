import { z } from "zod";
import { PlaybackStateSchema } from "../schemas/playback.schema";

export const SetPlaybackStateResponseSchema = PlaybackStateSchema;

export type SetPlaybackStateResponse = z.infer<
  typeof SetPlaybackStateResponseSchema
>;
