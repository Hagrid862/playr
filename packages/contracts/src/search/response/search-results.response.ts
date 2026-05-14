import { z } from "zod";
import { AlbumType } from "@repo/db";

export const ArtistSearchResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  verified: z.boolean(),
});

export const AlbumSearchResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  albumType: z.enum(AlbumType).optional(),
});

export const TrackSearchResultSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const LiveSearchResultsSchema = z.object({
  artists: z.array(ArtistSearchResultSchema),
  albums: z.array(AlbumSearchResultSchema),
  tracks: z.array(TrackSearchResultSchema),
}).refine((data) => {
  const total = data.artists.length + data.albums.length + data.tracks.length;
  return total <= 8;
}, {
  message: "Total number of search results (artists + albums + tracks) must be <= 8",
});

export type ArtistSearchResult = z.infer<typeof ArtistSearchResultSchema>;
export type AlbumSearchResult = z.infer<typeof AlbumSearchResultSchema>;
export type TrackSearchResult = z.infer<typeof TrackSearchResultSchema>;
export type LiveSearchResults = z.infer<typeof LiveSearchResultsSchema>;
