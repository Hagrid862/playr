import { z } from "zod";
import { AlbumType } from "@repo/db";

export const SearchResultTypeSchema = z.enum(["artist", "album", "track"]);

export const SearchResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: SearchResultTypeSchema,
  verified: z.boolean().optional(),
  albumType: z.enum(AlbumType).optional(),
});

export const LiveSearchResultsSchema = z.object({
  results: z.array(SearchResultSchema).max(8),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;
export type LiveSearchResults = z.infer<typeof LiveSearchResultsSchema>;
