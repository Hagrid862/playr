import { z } from "zod";

export const SearchSuggestionsCategoriesSchema = z.enum([
  "artist",
  "album",
  "track",
  "playlist",
  "genre",
]);

export const LibrarySearchSuggestionsQuerySchema = z.object({
  query: z.string().min(3, "Query must be at least 3 characters long"),
  categories: z
    .union([
      SearchSuggestionsCategoriesSchema,
      z.array(SearchSuggestionsCategoriesSchema),
    ])
    .transform((val) => (Array.isArray(val) ? val : val ? [val] : undefined))
    .optional(),
});

export type LibrarySearchSuggestionsQuery = z.infer<
  typeof LibrarySearchSuggestionsQuerySchema
>;

export type SearchSuggestionsCategories = z.infer<
  typeof SearchSuggestionsCategoriesSchema
>;
