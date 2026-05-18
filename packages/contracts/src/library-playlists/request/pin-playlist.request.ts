import { z } from "zod";

export const PinPlaylistRequestSchema = z.object({
  playlistId: z.string().min(1),
});

export type PinPlaylistRequest = z.infer<typeof PinPlaylistRequestSchema>;
