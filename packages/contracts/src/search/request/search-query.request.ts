import { z } from "zod";
import { Visibility, AlbumType } from "@repo/db";

// ─── Entity category filter ───────────────────────────────────────────

export const SearchCategorySchema = z.enum([
  "artist",
  "album",
  "track",
  "playlist",
  "genre",
]);

// ─── Visibility filter ────────────────────────────────────────────

export const SearchVisibilitySchema = z.enum(Visibility);

// ─── Order-by field ───────────────────────────────────────────────

export const SearchOrderByFieldSchema = z.enum([
  "relevance",
  "name",
  "createdAt",
  "releaseDate",
  "duration",
  "listenedCount",
]);

export const SearchOrderByDirectionSchema = z.enum(["asc", "desc"]);

export const SearchOrderBySchema = z.object({
  field: SearchOrderByFieldSchema,
  direction: SearchOrderByDirectionSchema.default("asc"),
});

// ─── Artist-specific filters ──────────────────────────────────────

export const SearchArtistFiltersSchema = z.object({
  verified: z.preprocess(
    (val) => (typeof val === "string" ? val.toLowerCase() === "true" : val),
    z.boolean().optional(),
  ),
  isCommunity: z.preprocess(
    (val) => (typeof val === "string" ? val.toLowerCase() === "true" : val),
    z.boolean().optional(),
  ),
});

// ─── Album-specific filters ───────────────────────────────────────

export const SearchAlbumFiltersSchema = z.object({
  type: z.enum(AlbumType).optional(),
  verified: z.preprocess(
    (val) => (typeof val === "string" ? val.toLowerCase() === "true" : val),
    z.boolean().optional(),
  ),
  releaseDateFrom: z.string().datetime().optional(),
  releaseDateTo: z.string().datetime().optional(),
});

// ─── Track-specific filters ───────────────────────────────────────

export const SearchTrackFiltersSchema = z.object({
  explicit: z.preprocess((val) => {
    if (typeof val === "string") {
      if (val.toLowerCase() === "true") return true;
      if (val.toLowerCase() === "false") return false;
    }
    return val;
  }, z.boolean().optional()),
  verified: z.preprocess(
    (val) => (typeof val === "string" ? val.toLowerCase() === "true" : val),
    z.boolean().optional(),
  ),
  durationFrom: z.coerce.number().int().nonnegative().optional(),
  durationTo: z.coerce.number().int().nonnegative().optional(),
  minListenedCount: z.coerce.number().int().nonnegative().optional(),
});

// ─── Playlist-specific filters ────────────────────────────────────

export const SearchPlaylistFiltersSchema = z.object({
  isPublic: z.preprocess(
    (val) => (typeof val === "string" ? val.toLowerCase() === "true" : val),
    z.boolean().optional(),
  ),
  isCollaborative: z.preprocess(
    (val) => (typeof val === "string" ? val.toLowerCase() === "true" : val),
    z.boolean().optional(),
  ),
});

// ─── Top-level filters bag ────────────────────────────────────────

export const SearchFiltersSchema = z.object({
  categories: z
    .union([SearchCategorySchema, z.array(SearchCategorySchema)])
    .transform((val) => (Array.isArray(val) ? val : val ? [val] : undefined))
    .optional(),

  visibility: SearchVisibilitySchema.optional(),

  artist: SearchArtistFiltersSchema.optional(),
  album: SearchAlbumFiltersSchema.optional(),
  track: SearchTrackFiltersSchema.optional(),
  playlist: SearchPlaylistFiltersSchema.optional(),
});

// ─── Main search query schema ─────────────────────────────────────

export const SearchQuerySchema = z
  .object({
    query: z
      .string()
      .min(3, "Query must be at least 3 characters long")
      .optional(),

    categories: z
      .preprocess(
        (val) => {
          if (typeof val === "string")
            return val.split(",").map((s) => s.trim());
          return val;
        },
        z.union([SearchCategorySchema, z.array(SearchCategorySchema)]),
      )
      .transform((val) => (Array.isArray(val) ? val : val ? [val] : undefined))
      .optional(),

    visibility: SearchVisibilitySchema.optional(),

    filters: SearchFiltersSchema.optional(),

    orderBy: SearchOrderBySchema.optional(),

    page: z.coerce.number().int().positive().default(1),

    pageSize: z.coerce.number().int().positive().max(100).default(20),
  })
  .transform((data) => {
    const { categories, visibility, filters, ...rest } = data;

    // Merge top-level categories and visibility into filters if provided
    const mergedFilters = {
      ...filters,
      ...(categories !== undefined && { categories }),
      ...(visibility !== undefined && { visibility }),
    };

    return {
      ...rest,
      filters:
        Object.keys(mergedFilters).length > 0 ? mergedFilters : undefined,
    };
  });

export type SearchQuery = z.infer<typeof SearchQuerySchema>;
export type SearchCategory = z.infer<typeof SearchCategorySchema>;
export type SearchVisibility = z.infer<typeof SearchVisibilitySchema>;
export type SearchOrderByField = z.infer<typeof SearchOrderByFieldSchema>;
export type SearchOrderByDirection = z.infer<
  typeof SearchOrderByDirectionSchema
>;
export type SearchOrderBy = z.infer<typeof SearchOrderBySchema>;
export type SearchArtistFilters = z.infer<typeof SearchArtistFiltersSchema>;
export type SearchAlbumFilters = z.infer<typeof SearchAlbumFiltersSchema>;
export type SearchTrackFilters = z.infer<typeof SearchTrackFiltersSchema>;
export type SearchPlaylistFilters = z.infer<typeof SearchPlaylistFiltersSchema>;
export type SearchFilters = z.infer<typeof SearchFiltersSchema>;
