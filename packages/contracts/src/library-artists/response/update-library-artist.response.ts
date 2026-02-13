import { z } from "zod";
import { createApiResponseSchema } from "../../api";
import { ArtistSchema } from "../../schemas";

export const UpdateLibraryArtistResponseSchema =
  createApiResponseSchema(ArtistSchema);

export type UpdateLibraryArtistResponse = z.infer<
  typeof UpdateLibraryArtistResponseSchema
>;
