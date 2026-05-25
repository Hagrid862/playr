import { z } from "zod";

export const ReorderPlaylistTracksRequestSchema = z.object({
  orderedTrackIds: z.array(z.string().min(1)).min(1),
});

export type ReorderPlaylistTracksRequest = z.infer<
  typeof ReorderPlaylistTracksRequestSchema
>;
