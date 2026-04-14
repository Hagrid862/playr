import { z } from "zod";

export const DeleteLibraryGenreRequestSchema = z.object({
  id: z.string(),
});

export type DeleteLibraryGenreRequest = z.infer<
  typeof DeleteLibraryGenreRequestSchema
>;
