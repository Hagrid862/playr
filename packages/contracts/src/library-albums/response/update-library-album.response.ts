import { z } from "zod";
import { createApiResponseSchema } from "../../api";
import { AlbumSchema } from "../../schemas";

export const UpdateLibraryAlbumResponseSchema =
  createApiResponseSchema(AlbumSchema);

export type UpdateLibraryAlbumResponse = z.infer<
  typeof UpdateLibraryAlbumResponseSchema
>;
