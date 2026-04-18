import { z } from "zod";

export const UpdateLibraryGenreRequestSchema = z
  .object({
    name: z
      .string()
      .min(1, "Genre name cannot be empty")
      .max(255, "Genre name must be 255 characters or less")
      .optional(),
  })
  .refine((data) => data.name !== undefined, {
    message: "At least one field must be provided",
  });

export type UpdateLibraryGenreRequest = z.infer<
  typeof UpdateLibraryGenreRequestSchema
>;
