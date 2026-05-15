import { z } from "zod";
import { AlbumType, Visibility } from "@repo/db";

export enum SearchResultType {
  Artist = "artist",
  Album = "album",
  Track = "track",
}

export const LiveSearchResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(SearchResultType),
  visibility: z.enum(Visibility),
  albumType: z.enum(AlbumType).nullable().optional(),
});

export const LiveSearchResultsSchema = z.array(LiveSearchResultSchema).refine(
  (data) => {
    return data.length <= 8;
  },
  {
    message: "Total number of search results must be <= 8",
  },
);

export type LiveSearchResult = z.infer<typeof LiveSearchResultSchema>;
export type LiveSearchResults = z.infer<typeof LiveSearchResultsSchema>;
