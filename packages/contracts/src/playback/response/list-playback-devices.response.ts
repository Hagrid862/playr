import { z } from "zod";

export const PlaybackDeviceSchema = z
  .object({
    deviceId: z.string().min(1),
    deviceName: z.string().min(1),
    deviceIcon: z.enum([
      "desktop",
      "mobile",
      "tablet",
      "speaker",
      "tv",
      "game-console",
      "other",
    ]),
    isActive: z.boolean(),
    isCurrentDevice: z.boolean(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

export const ListPlaybackDevicesResponseSchema = z
  .object({
    devices: z.array(PlaybackDeviceSchema),
  })
  .strict();

export type PlaybackDevice = z.infer<typeof PlaybackDeviceSchema>;
export type ListPlaybackDevicesResponse = z.infer<typeof ListPlaybackDevicesResponseSchema>;
