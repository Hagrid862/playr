import { z } from "zod";

export const CreateLibraryPlaylistRequestSchema = z.object({
  name: z.string().trim().min(1).max(200),
});

export type CreateLibraryPlaylistRequest = z.infer<
  typeof CreateLibraryPlaylistRequestSchema
>;
