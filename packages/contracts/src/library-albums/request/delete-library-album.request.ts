import { z } from "zod";

export const DeleteLibraryAlbumRequestSchema = z.object({
  id: z.string(),
});

export type DeleteLibraryAlbumRequest = z.infer<
  typeof DeleteLibraryAlbumRequestSchema
>;
