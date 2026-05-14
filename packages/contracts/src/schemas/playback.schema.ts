import { z } from "zod";

export const PlaybackTrackSchema = z.object({
  id: z.string(),
  title: z.string(),
  artists: z.array(z.string()),
  albumArt: z.string(),
  albumName: z.string(),
  albumId: z.string(),
  duration: z.number().min(0).int(),
});

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

export type PlaybackTrack = z.infer<typeof PlaybackTrackSchema>;
export type PlaybackState = z.infer<typeof PlaybackStateSchema>;
export type PlaybackStatePayload = z.infer<typeof PlaybackStatePayloadSchema>;
