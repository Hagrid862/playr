import { z } from "zod";
import { SearchResultsResponseSchema } from "../response/search-results.response";

// Library search results response should be identical to standard search results
// but we don't need `loggedIn` since it's forced by the guard.
export const LibrarySearchResultsResponseSchema = SearchResultsResponseSchema.omit({
  loggedIn: true,
});

export type LibrarySearchResultsResponse = z.infer<typeof LibrarySearchResultsResponseSchema>;
