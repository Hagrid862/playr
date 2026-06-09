import { z } from "zod";

export const SearchSuggestionsQuerySchema = z.object({
  query: z.string().min(3, "Query must be at least 3 characters long"),
});

export type SearchSuggestionsQuery = z.infer<
  typeof SearchSuggestionsQuerySchema
>;
