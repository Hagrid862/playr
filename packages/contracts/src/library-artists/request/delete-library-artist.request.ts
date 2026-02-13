import { z } from "zod";

export const DeleteLibraryArtistRequestSchema = z.object({
  id: z.string(),
});

export type DeleteLibraryArtistRequest = z.infer<
  typeof DeleteLibraryArtistRequestSchema
>;
