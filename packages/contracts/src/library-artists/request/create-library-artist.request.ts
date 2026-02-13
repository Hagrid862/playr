import { z } from "zod";
import { zodRequiredString } from "../../utils/zod-shared";

export const CreateLibraryArtistRequestSchema = z.object({
  name: zodRequiredString("Artist name is required").pipe(
    z
      .string()
      .min(1, "Artist name is required")
      .max(255, "Artist name must be 255 characters or less"),
  ),
  description: z
    .string()
    .max(2048, "Description must be 2048 characters or less")
    .optional(),
});

export type CreateLibraryArtistRequest = z.infer<
  typeof CreateLibraryArtistRequestSchema
>;
