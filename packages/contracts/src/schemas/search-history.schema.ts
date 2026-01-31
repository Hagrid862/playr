import { type SearchHistory } from "@repo/db";
import z from "zod";

export const SearchHistorySchema = z.object({
  id: z.string(),
  query: z.string(),
  searchedAt: z.date(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
}) satisfies z.ZodType<SearchHistory>;

export type ZodSearchHistory = z.infer<typeof SearchHistorySchema>;
