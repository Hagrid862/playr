import { z } from "zod";
import { PlaybackTrackSchema, QueueItemSchema } from "./playback-track.schema";

export const PlaybackStateSchema = z.object({
  sessionId: z.string().nonempty(),
  userId: z.string().nonempty(),
  deviceName: z.string(),
  deviceIcon: z.enum([
    "desktop",
    "mobile",
    "tablet",
    "speaker",
    "tv",
    "game-console",
    "other",
  ]),
  isPlaying: z.boolean(),
  trackData: PlaybackTrackSchema,
  queue: z.array(QueueItemSchema),
  currentTime: z.number().min(0).int(),
  volume: z.number().min(0).max(1),
  repeatMode: z.enum(["off", "all", "one"]),
  shuffle: z.boolean(),
  favorited: z.enum(["favorited", "disliked", "not-set"]),
  inLibrary: z.boolean(),
  version: z.number().int().min(0),
  updatedAt: z.iso.datetime(),
});

export const PlaybackStatePayloadSchema = PlaybackStateSchema.omit({
  version: true,
  updatedAt: true,
}).strict();

export type PlaybackState = z.infer<typeof PlaybackStateSchema>;
export type PlaybackStatePayload = z.infer<typeof PlaybackStatePayloadSchema>;
