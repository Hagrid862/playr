import { z } from "zod";

export const UpdateLibraryArtistRequestSchema = z.object({
  name: z
    .string()
    .min(1, "Artist name cannot be empty")
    .max(255, "Artist name must be 255 characters or less")
    .optional(),
  description: z
    .string()
    .max(2048, "Description must be 2048 characters or less")
    .optional(),
  /** When set (including `[]`), replaces all artist genres. Omit to leave genres unchanged. */
  genreIds: z.array(z.string()).optional(),
});

export type UpdateLibraryArtistRequest = z.infer<
  typeof UpdateLibraryArtistRequestSchema
>;
