import { z } from "zod";
import { Visibility, AlbumType } from "@repo/db";
import {
  SearchFiltersSchema,
  SearchOrderBySchema,
} from "../request/search-query.request";
import { createApiResponseSchema } from "../../api/response.schema";

// ─── Base fields shared by every result item ───────────────────────
// Mirrors SearchSuggestionResultSchema but adds `score` (relevance)
// so the client can optionally re-sort client-side.

export const SearchResultBaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["artist", "album", "track", "playlist", "genre"]),
  visibility: z.nativeEnum(Visibility),
  albumType: z.nativeEnum(AlbumType).nullable().optional(),
  score: z.number(),
  explicit: z.boolean().nullable().optional(),
  coverUrl: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  authorName: z.string().nullable().optional(),
  authorId: z.string().nullable().optional(),
});

// ─── Per-entity result schemas ─────────────────────────────────────

export const SearchArtistResultSchema = SearchResultBaseSchema.extend({
  type: z.literal("artist"),
  verified: z.boolean().optional(),
  isCommunity: z.boolean().optional(),
  description: z.string().nullable().optional(),
});

export const SearchAlbumResultSchema = SearchResultBaseSchema.extend({
  type: z.literal("album"),
  albumType: z.nativeEnum(AlbumType),
  releaseDate: z.string().datetime().nullable().optional(),
  totalTracks: z.number().int().nonnegative().optional(),
  totalDuration: z.number().int().nonnegative().optional(),
  description: z.string().nullable().optional(),
});

export const SearchTrackResultSchema = SearchResultBaseSchema.extend({
  type: z.literal("track"),
  duration: z.number().int().nonnegative().optional(),
  trackNumber: z.number().int().nonnegative().optional(),
  diskNumber: z.number().int().nonnegative().optional(),
  explicit: z.boolean(),
  listenedCount: z.number().int().nonnegative().optional(),
  albumId: z.string().optional(),
  lyrics: z.string().nullable().optional(),
}).refine((data) => data.explicit !== null && data.explicit !== undefined);

export const SearchPlaylistResultSchema = SearchResultBaseSchema.extend({
  type: z.literal("playlist"),
  isPublic: z.boolean().optional(),
  description: z.string().nullable().optional(),
  trackCount: z.number().int().nonnegative().optional(),
});

export const SearchGenreResultSchema = SearchResultBaseSchema.extend({
  type: z.literal("genre"),
});

// ─── Discriminated union of all result types ───────────────────────

export const SearchResultItemSchema = z.discriminatedUnion("type", [
  SearchArtistResultSchema,
  SearchAlbumResultSchema,
  SearchTrackResultSchema,
  SearchPlaylistResultSchema,
  SearchGenreResultSchema,
]);

// ─── Paginated search response ─────────────────────────────────────
// `data` – flat array of mixed-type results (like suggestions)
// Echoes back the active `filters` and `orderBy` so the client can
// reconstruct the current UI state without reparsing the request.

export const SearchResultsDataSchema = z.object({
  results: z.array(SearchResultItemSchema),

  loggedIn: z.boolean(),

  // ── pagination ────────────────────────────────────────────────
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),

  // ── echo of the request state ─────────────────────────────────
  filters: SearchFiltersSchema.nullable(),
  orderBy: SearchOrderBySchema.nullable(),
});

export const SearchResultsResponseSchema = createApiResponseSchema(
  SearchResultsDataSchema,
);

export type SearchResultItem = z.infer<typeof SearchResultItemSchema>;
export type SearchArtistResult = z.infer<typeof SearchArtistResultSchema>;
export type SearchAlbumResult = z.infer<typeof SearchAlbumResultSchema>;
export type SearchTrackResult = z.infer<typeof SearchTrackResultSchema>;
export type SearchPlaylistResult = z.infer<typeof SearchPlaylistResultSchema>;
export type SearchResultsData = z.infer<typeof SearchResultsDataSchema>;
export type SearchResultsResponse = z.infer<typeof SearchResultsResponseSchema>;
