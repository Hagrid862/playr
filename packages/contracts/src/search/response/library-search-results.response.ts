import { z } from "zod";
import { SearchResultItemSchema } from "./search-results.response";
import {
  SearchFiltersSchema,
  SearchOrderBySchema,
} from "../request/search-query.request";
import { createApiResponseSchema } from "../../api/response.schema";

// Library search results response should be identical to standard search results
// but we don't need `loggedIn` since it's forced by the guard.
export const LibrarySearchResultsDataSchema = z.object({
  results: z.array(SearchResultItemSchema),

  // ── pagination ────────────────────────────────────────────────
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),

  // ── echo of the request state ─────────────────────────────────
  filters: SearchFiltersSchema.nullable(),
  orderBy: SearchOrderBySchema.nullable(),
});

export const LibrarySearchResultsResponseSchema = createApiResponseSchema(
  LibrarySearchResultsDataSchema,
);

export type LibrarySearchResultsData = z.infer<
  typeof LibrarySearchResultsDataSchema
>;
export type LibrarySearchResultsResponse = z.infer<
  typeof LibrarySearchResultsResponseSchema
>;
