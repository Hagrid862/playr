import { z } from "zod";
import { SearchSuggestionResultSchema } from "./search-suggestions-results.response";
import { createApiResponseSchema } from "../../api/response.schema";

export const LibrarySearchSuggestionsDataSchema = z.object({
  results: z.array(SearchSuggestionResultSchema).refine(
    (data) => {
      return data.length <= 8;
    },
    {
      message: "Total number of search results must be <= 8",
    },
  ),
});

export const LibrarySearchSuggestionsResultsSchema = createApiResponseSchema(
  LibrarySearchSuggestionsDataSchema,
);

export type LibrarySearchSuggestionsData = z.infer<
  typeof LibrarySearchSuggestionsDataSchema
>;
export type LibrarySearchSuggestionsResults = z.infer<
  typeof LibrarySearchSuggestionsResultsSchema
>;
