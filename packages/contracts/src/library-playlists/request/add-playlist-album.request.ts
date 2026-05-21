import { z } from "zod";

export const AddPlaylistAlbumRequestSchema = z.object({
  albumId: z.string().min(1),
});

export type AddPlaylistAlbumRequest = z.infer<
  typeof AddPlaylistAlbumRequestSchema
>;
