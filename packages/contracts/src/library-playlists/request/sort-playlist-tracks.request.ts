import { z } from "zod";
import { SortPlaylistTracksByAddedAtSchema } from "../playlist-track-sort";

export const SortPlaylistTracksRequestSchema = z.object({
  sort: SortPlaylistTracksByAddedAtSchema,
});

export type SortPlaylistTracksRequest = z.infer<
  typeof SortPlaylistTracksRequestSchema
>;
