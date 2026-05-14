import { AlbumType } from "@repo/db";
import { z } from "zod";
import { zodDateTimeNullable } from "../../utils";
import { libraryGenreIdsSchema } from "../../utils/genre-ids";

export const UpdateLibraryAlbumRequestSchema = z.object({
  name: z
    .string()
    .min(1, "Album name cannot be empty")
    .max(255, "Album name must be 255 characters or less")
    .optional(),
  description: z
    .string()
    .max(2048, "Description must be 2048 characters or less")
    .optional(),
  type: z.enum(AlbumType).optional(),
  releaseDate: zodDateTimeNullable().optional(),
  coverId: z.string().nullable().optional(),
  /** When set (including `[]`), replaces all album genres. Omit to leave genres unchanged. */
  genreIds: libraryGenreIdsSchema.optional(),
});

export type UpdateLibraryAlbumRequest = z.infer<
  typeof UpdateLibraryAlbumRequestSchema
>;
