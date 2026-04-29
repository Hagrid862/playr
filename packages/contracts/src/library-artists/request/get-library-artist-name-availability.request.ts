import { z } from "zod";

export const GetLibraryArtistNameAvailabilityRequestSchema = z.object({
  name: z
    .string()
    .min(1, "Artist name is required")
    .max(255, "Artist name must be 255 characters or less"),
});

export type GetLibraryArtistNameAvailabilityRequest = z.infer<
  typeof GetLibraryArtistNameAvailabilityRequestSchema
>;
