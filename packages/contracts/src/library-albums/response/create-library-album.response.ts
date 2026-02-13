import { z } from "zod";
import { createApiResponseSchema } from "../../api";
import { AlbumSchema } from "../../schemas";

export const CreateLibraryAlbumResponseSchema =
  createApiResponseSchema(AlbumSchema);

export type CreateLibraryAlbumResponse = z.infer<
  typeof CreateLibraryAlbumResponseSchema
>;
