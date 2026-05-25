import { z } from "zod";

export const UpdateLibraryPlaylistRequestSchema = z.object({
  name: z.string().trim().min(1).max(200),
});

export type UpdateLibraryPlaylistRequest = z.infer<
  typeof UpdateLibraryPlaylistRequestSchema
>;
