import { z } from "zod";

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
  trackData: z.object({
    id: z.string(),
    title: z.string(),
    artists: z.array(z.string()),
    albumArt: z.string(),
    albumName: z.string(),
    albumId: z.string(),
    duration: z.number().min(0).int(),
  }),
  currentTime: z.number().min(0).int(),
  volume: z.number().min(0).max(1),
  repeatMode: z.enum(["off", "all", "one"]),
  shuffle: z.boolean(),
  favorited: z.enum(["favorited", "disliked", "not-set"]),
  inLibrary: z.boolean(),
});

export type PlaybackState = z.infer<typeof PlaybackStateSchema>;
