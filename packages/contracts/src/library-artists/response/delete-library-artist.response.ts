import { z } from "zod";
import { createApiResponseSchema } from "../../api";
import { ArtistSchema } from "../../schemas";

export const DeleteLibraryArtistResponseSchema =
  createApiResponseSchema(ArtistSchema);

export type DeleteLibraryArtistResponse = z.infer<
  typeof DeleteLibraryArtistResponseSchema
>;
