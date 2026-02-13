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
});

export type UpdateLibraryArtistRequest = z.infer<
  typeof UpdateLibraryArtistRequestSchema
>;
