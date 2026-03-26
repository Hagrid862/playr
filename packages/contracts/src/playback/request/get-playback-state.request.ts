import { z } from "zod";

export const GetPlaybackStateRequestSchema = z.object({}).strict();

export type GetPlaybackStateRequest = z.infer<
  typeof GetPlaybackStateRequestSchema
>;
