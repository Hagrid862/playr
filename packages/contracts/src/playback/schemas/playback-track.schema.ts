import { z } from "zod";

export const PlaybackTrackSchema = z.object({
  id: z.string().nonempty(),
  title: z.string().nonempty(),
  trackId: z.string().nonempty(),
  artists: z.array(z.string().nonempty()),
  albumName: z.string().nonempty(),
  albumId: z.string().nonempty(),
  albumArt: z.string().nullable(),
  duration: z.number().int().min(0),
  explicit: z.boolean(),
});

export const QueueItemSchema = z.object({
  queueId: z.uuidv6(),
  track: PlaybackTrackSchema,
  position: z.number().int().min(0),
  /** Legacy persisted documents may omit this; treat as manual queue. */
  type: z.enum(["queue", "playingNext"]).default("queue"),
  /** Legacy persisted documents may omit this; align with first slot. */
  originalPosition: z.number().int().min(0).optional(),
});

export type PlaybackTrack = z.infer<typeof PlaybackTrackSchema>;
export type QueueItem = z.infer<typeof QueueItemSchema>;
