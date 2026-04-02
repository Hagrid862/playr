import { z } from "zod";
import { PlaybackDeviceSchema } from "./playback-device.schema";
import { PlaybackTrackSchema, QueueItemSchema } from "./playback-track.schema";

/** Max items in `PlaybackState.history` (newest-first back-stack); client and server should align. */
export const PLAYBACK_HISTORY_MAX_LENGTH = 1024;

export const PlaybackStateSchema = z.object({
  userId: z.string().nonempty(),
  activeDeviceId: z.string().nullable().optional(),
  devices: z.array(PlaybackDeviceSchema),

  isPlaying: z.boolean(),
  trackData: PlaybackTrackSchema,
  currentTime: z.number().min(0).int(),

  queue: z.array(QueueItemSchema),
  /** Newest-first stack for Previous / repeat-all; synced with the server. */
  history: z.array(QueueItemSchema).default([]),

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
