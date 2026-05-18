import { z } from "zod";

export const GetLibraryPlaylistDetailRequestSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  /** Playlist detail UI loads up to 200 tracks in one request; keep headroom for pagination. */
  limit: z.coerce.number().int().min(1).max(500).default(50),
});

export type GetLibraryPlaylistDetailRequest = z.infer<
  typeof GetLibraryPlaylistDetailRequestSchema
>;
