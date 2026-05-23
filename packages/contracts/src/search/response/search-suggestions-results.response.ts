import { z } from "zod";
import { AlbumType, Visibility } from "@repo/db";
import { createApiResponseSchema } from "../../api/response.schema";

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
  type: z.nativeEnum(SearchResultType),
  coverURL: z.string().nullable().optional(),
  avatarURL: z.string().nullable().optional(),
  visibility: z.nativeEnum(Visibility),
  albumType: z.nativeEnum(AlbumType).nullable().optional(),
});

export const SearchSuggestionsDataSchema = z.object({
  results: z.array(SearchSuggestionResultSchema).refine(
    (data) => {
      return data.length <= 8;
    },
    {
      message: "Total number of search results must be <= 8",
    },
  ),
  loggedIn: z.boolean(),
});

export const SearchSuggestionsResultsSchema = createApiResponseSchema(
  SearchSuggestionsDataSchema,
);

export type SearchSuggestionsResult = z.infer<
  typeof SearchSuggestionResultSchema
>;
export type SearchSuggestionsData = z.infer<
  typeof SearchSuggestionsDataSchema
>;
export type SearchSuggestionsResults = z.infer<
  typeof SearchSuggestionsResultsSchema
>;
