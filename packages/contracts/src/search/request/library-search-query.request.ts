import { z } from "zod";
import { SearchQuerySchema } from "./search-query.request";

export const LibrarySearchQuerySchema = SearchQuerySchema

export type LibrarySearchQuery = z.infer<typeof LibrarySearchQuerySchema>;
