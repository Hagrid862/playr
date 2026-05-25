import { z } from "zod";

export const PlaylistTrackSortSchema = z.enum([
  "order",
  "addedAt_asc",
  "addedAt_desc",
]);

export type PlaylistTrackSort = z.infer<typeof PlaylistTrackSortSchema>;

export const SortPlaylistTracksByAddedAtSchema = z.enum([
  "addedAt_asc",
  "addedAt_desc",
]);

export type SortPlaylistTracksByAddedAt = z.infer<
  typeof SortPlaylistTracksByAddedAtSchema
>;
