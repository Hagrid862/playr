import { z } from "zod";
import { PlaybackStateSchema } from "../schemas/playback.schema";

export const SetPlaybackStateRequestSchema = z
  .object({
    state: PlaybackStateSchema.omit({
      sessionId: true,
      activeDeviceId: true,
      userId: true,
      version: true,
      updatedAt: true,
    }).strict(),
    expectedVersion: z.number().int().min(0).default(0),
    claimActiveDevice: z.boolean().default(false),
  })
  .strict();

export type SetPlaybackStateRequest = z.infer<
  typeof SetPlaybackStateRequestSchema
>;
