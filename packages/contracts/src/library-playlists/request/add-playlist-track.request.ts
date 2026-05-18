import { z } from "zod";

export const AddPlaylistTrackRequestSchema = z.object({
  trackId: z.string().min(1),
});

export type AddPlaylistTrackRequest = z.infer<
  typeof AddPlaylistTrackRequestSchema
>;
