import { z } from "zod";
import { zodRequiredString } from "../../utils/zod-shared";

export const CreateLibraryGenreRequestSchema = z.object({
  name: zodRequiredString("Genre name is required").pipe(
    z
      .string()
      .min(1, "Genre name is required")
      .max(255, "Genre name must be 255 characters or less"),
  ),
});

export type CreateLibraryGenreRequest = z.infer<
  typeof CreateLibraryGenreRequestSchema
>;
