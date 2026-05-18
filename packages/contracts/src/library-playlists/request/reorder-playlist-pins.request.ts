import { z } from "zod";

export const ReorderPlaylistPinsRequestSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});

export type ReorderPlaylistPinsRequest = z.infer<
  typeof ReorderPlaylistPinsRequestSchema
>;
