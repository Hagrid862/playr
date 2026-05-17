import { z } from "zod";
import { AlbumType, Visibility } from "@repo/db";

export enum SearchResultType {
  Artist = "artist",
  Album = "album",
  Track = "track",
  Playlist = "playlist",
  Genre = "genre",
}

export const SearchSuggestionResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(SearchResultType),
  coverURL: z.string().nullable().optional(),
  avatarURL: z.string().nullable().optional(),
  visibility: z.enum(Visibility),
  albumType: z.enum(AlbumType).nullable().optional(),
});

export const SearchSuggestionsResultsSchema = z
  .array(SearchSuggestionResultSchema)
  .refine(
    (data) => {
      return data.length <= 8;
    },
    {
      message: "Total number of search results must be <= 8",
    },
  );

export type SearchSuggestionsResult = z.infer<
  typeof SearchSuggestionResultSchema
>;
export type SearchSuggestionsResults = z.infer<
  typeof SearchSuggestionsResultsSchema
>;
