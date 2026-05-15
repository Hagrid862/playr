import { z } from "zod";
import { AlbumType, Visibility } from "@repo/db";

enum SearchResultType {
  Artist = "artist",
  Album = "album",
  Track = "track",
}

export const ArtistSearchResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(SearchResultType),
  visibility: z.enum(Visibility),
});

export const AlbumSearchResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(SearchResultType),
  visibility: z.enum(Visibility),
  albumType: z.enum(AlbumType),
});

export const TrackSearchResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(SearchResultType),
  visibility: z.enum(Visibility),
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
