import { z } from "zod";
import { PlaybackStateSchema } from "../../schemas/playback.schema";

export const GetPlaybackStateResponseSchema = PlaybackStateSchema.nullable();

export type GetPlaybackStateResponse = z.infer<
  typeof GetPlaybackStateResponseSchema
>;
