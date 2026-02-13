import { z } from "zod";
import { createApiResponseSchema } from "../../api";
import { ArtistSchema } from "../../schemas";

export const CreateLibraryArtistResponseSchema =
  createApiResponseSchema(ArtistSchema);

export type CreateLibraryArtistResponse = z.infer<
  typeof CreateLibraryArtistResponseSchema
>;
