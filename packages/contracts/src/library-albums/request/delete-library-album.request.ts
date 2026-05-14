import { z } from "zod";

export const DeleteLibraryAlbumRequestSchema = z.object({
  id: z.string(),
});

export type DeleteLibraryAlbumRequest = z.infer<
  typeof DeleteLibraryAlbumRequestSchema
>;

export const DeleteLibraryAlbumQuerySchema = z.object({
  keepTracks: z.coerce.boolean().optional().default(false),
});

export type DeleteLibraryAlbumQuery = z.infer<
  typeof DeleteLibraryAlbumQuerySchema
>;
