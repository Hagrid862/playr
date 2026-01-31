import { type SearchHistory } from "@repo/db";
import z from "zod";
import { zodDateTime } from "../utils/zod-datetime";

export const SearchHistorySchema = z.object({
  id: z.string(),
  query: z.string(),
  searchedAt: zodDateTime(),
  userId: z.string(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
}) satisfies z.ZodType<SearchHistory>;

export type ZodSearchHistory = z.infer<typeof SearchHistorySchema>;
