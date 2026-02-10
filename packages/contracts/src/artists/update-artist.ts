import { z } from "zod";
import { createApiResponseSchema } from "../api";
import { ArtistSchema } from "../schemas";

export const UpdateArtistRequestSchema = z.object({
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

export type UpdateArtistRequest = z.infer<typeof UpdateArtistRequestSchema>;

export const UpdateArtistResponseSchema = createApiResponseSchema(ArtistSchema);

export type UpdateArtistResponse = z.infer<typeof UpdateArtistResponseSchema>;
