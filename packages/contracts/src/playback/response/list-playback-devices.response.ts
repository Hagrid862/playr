import { z } from "zod";
import { PlaybackDeviceSchema } from "../schemas/playback-device.schema";

/** Connected devices from the registry (includes selection flags for the current client). */
export const ListPlaybackDeviceEntrySchema = PlaybackDeviceSchema.extend({
  isActive: z.boolean(),
  isCurrentDevice: z.boolean(),
});

export const ListPlaybackDevicesResponseSchema = z
  .object({
    devices: z.array(ListPlaybackDeviceEntrySchema),
  })
  .strict();

export type ListPlaybackDeviceEntry = z.infer<
  typeof ListPlaybackDeviceEntrySchema
>;

export type ListPlaybackDevicesResponse = z.infer<
  typeof ListPlaybackDevicesResponseSchema
>;
