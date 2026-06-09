import { z } from "zod";
import { SearchSuggestionResultSchema } from "./search-suggestions-results.response";

export const LibrarySearchSuggestionsResultsSchema = z.object({
  results: z.array(SearchSuggestionResultSchema).refine(
    (data) => {
      return data.length <= 8;
    },
    {
      message: "Total number of search results must be <= 8",
    },
  ),
});

export type LibrarySearchSuggestionsResults = z.infer<
  typeof LibrarySearchSuggestionsResultsSchema
>;
