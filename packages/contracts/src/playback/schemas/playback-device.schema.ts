import { z } from "zod";

export const PlaybackDeviceSchema = z.object({
  id: z.string().nonempty(),
  name: z.string().nonempty(),
  icon: z.enum([
    "desktop",
    "mobile",
    "tablet",
    "speaker",
    "tv",
    "game-console",
    "other",
  ]),
});

export type PlaybackDevice = z.infer<typeof PlaybackDeviceSchema>;
