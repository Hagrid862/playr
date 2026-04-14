import { AlbumType } from "@repo/db";
import { z } from "zod";
import { zodDateTimeNullable } from "../../utils";
import { zodRequiredString } from "../../utils/zod-shared";

export const CreateLibraryAlbumRequestSchema = z.object({
  name: zodRequiredString("Album name is required").pipe(
    z
      .string()
      .min(1, "Album name is required")
      .max(255, "Album name must be 255 characters or less"),
  ),
  description: z
    .string()
    .max(2048, "Description must be 2048 characters or less")
    .optional(),
  type: z.enum(AlbumType),
  artistId: zodRequiredString("Artist ID is required"),
  releaseDate: zodDateTimeNullable(),
  /** Optional initial genres (system + this library's custom). */
  genreIds: z.array(z.string()).optional(),
});

export type CreateLibraryAlbumRequest = z.infer<
  typeof CreateLibraryAlbumRequestSchema
>;
