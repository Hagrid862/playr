import { z } from "zod";
import { createApiResponseSchema } from "../../api";
import { AlbumSchema } from "../../schemas";

export const DeleteLibraryAlbumResponseSchema =
  createApiResponseSchema(AlbumSchema);

export type DeleteLibraryAlbumResponse = z.infer<
  typeof DeleteLibraryAlbumResponseSchema
>;
