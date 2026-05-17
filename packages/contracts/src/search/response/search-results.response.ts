import { z } from "zod";
import { Visibility, AlbumType } from "@repo/db";
import {
  SearchFiltersSchema,
  SearchOrderBySchema,
} from "../request/search-query.request";

// ─── Base fields shared by every result item ───────────────────────
// Mirrors SearchSuggestionResultSchema but adds `score` (relevance)
// so the client can optionally re-sort client-side.

export const SearchResultBaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(), // discriminated at union level
  visibility: z.enum(Visibility),
  albumType: z.enum(AlbumType).nullable().optional(),
  score: z.number(),
});

// ─── Per-entity result schemas ─────────────────────────────────────

export const SearchArtistResultSchema = SearchResultBaseSchema.extend({
  type: z.literal("artist"),
  verified: z.boolean(),
  isCommunity: z.boolean(),
  description: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
});

export const SearchAlbumResultSchema = SearchResultBaseSchema.extend({
  type: z.literal("album"),
  albumType: z.enum(AlbumType),
  releaseDate: z.string().datetime().nullable().optional(),
  totalTracks: z.number().int().nonnegative(),
  totalDuration: z.number().int().nonnegative(),
  description: z.string().nullable().optional(),
  coverUrl: z.string().nullable().optional(),
});

export const SearchTrackResultSchema = SearchResultBaseSchema.extend({
  type: z.literal("track"),
  duration: z.number().int().nonnegative(),
  trackNumber: z.number().int().nonnegative(),
  diskNumber: z.number().int().nonnegative(),
  explicit: z.boolean(),
  listenedCount: z.number().int().nonnegative(),
  albumId: z.string(),
  lyrics: z.string().nullable().optional(),
  coverUrl: z.string().nullable().optional(),
});

export const SearchPlaylistResultSchema = SearchResultBaseSchema.extend({
  type: z.literal("playlist"),
  isPublic: z.boolean(),
  description: z.string().nullable().optional(),
  trackCount: z.number().int().nonnegative().optional(),
  coverUrl: z.string().nullable().optional(),
});

// ─── Discriminated union of all result types ───────────────────────

export const SearchResultItemSchema = z.discriminatedUnion("type", [
  SearchArtistResultSchema,
  SearchAlbumResultSchema,
  SearchTrackResultSchema,
  SearchPlaylistResultSchema,
]);

// ─── Paginated search response ─────────────────────────────────────
// `data` – flat array of mixed-type results (like suggestions)
// Echoes back the active `filters` and `orderBy` so the client can
// reconstruct the current UI state without reparsing the request.

export const SearchResultsResponseSchema = z.object({
  data: z.array(SearchResultItemSchema),

  // ── pagination ────────────────────────────────────────────────
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),

  // ── echo of the request state ─────────────────────────────────
  filters: SearchFiltersSchema.nullable(),
  orderBy: SearchOrderBySchema.nullable(),
});

export type SearchResultItem = z.infer<typeof SearchResultItemSchema>;
export type SearchArtistResult = z.infer<typeof SearchArtistResultSchema>;
export type SearchAlbumResult = z.infer<typeof SearchAlbumResultSchema>;
export type SearchTrackResult = z.infer<typeof SearchTrackResultSchema>;
export type SearchPlaylistResult = z.infer<typeof SearchPlaylistResultSchema>;
export type SearchResultsResponse = z.infer<typeof SearchResultsResponseSchema>;
