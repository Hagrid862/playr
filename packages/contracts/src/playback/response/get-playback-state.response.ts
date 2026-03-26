import { z } from "zod";
import { PlaybackStateSchema } from "../../schemas/playback.schema";

export const GetPlaybackStateResponseSchema = PlaybackStateSchema;

export type GetPlaybackStateResponse = z.infer<
  typeof GetPlaybackStateResponseSchema
>;
