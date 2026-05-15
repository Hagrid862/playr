import { z } from "zod";

export const SearchQuerySchema = z.object({
  query: z.string().min(4),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;
