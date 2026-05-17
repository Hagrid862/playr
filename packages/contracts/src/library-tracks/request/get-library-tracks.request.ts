import { z } from "zod";

export const LibraryTrackListSortBySchema = z.enum([
  "title",
  "artist",
  "album",
  "trackNumber",
  "duration",
  "diskNumber",
]);

export const LibraryTrackListSortOrderSchema = z.enum(["asc", "desc"]);

export type LibraryTrackListSortBy = z.infer<typeof LibraryTrackListSortBySchema>;
export type LibraryTrackListSortOrder = z.infer<
  typeof LibraryTrackListSortOrderSchema
>;

export const GetLibraryTracksRequestSchema = z
  .object({
    albumId: z.string().optional(),
    genreId: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: LibraryTrackListSortBySchema.optional(),
    sortOrder: LibraryTrackListSortOrderSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.sortBy && !data.sortOrder) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "sortOrder is required when sortBy is provided",
        path: ["sortOrder"],
      });
    }
    if (data.sortOrder && !data.sortBy) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "sortBy is required when sortOrder is provided",
        path: ["sortBy"],
      });
    }
  });

export type GetLibraryTracksRequest = z.infer<
  typeof GetLibraryTracksRequestSchema
>;
