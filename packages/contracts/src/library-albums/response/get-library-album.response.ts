import { z } from "zod";
import { createApiResponseSchema } from "../../api";
import { AlbumSchema } from "../../schemas";

export const GetLibraryAlbumResponseSchema =
  createApiResponseSchema(AlbumSchema);

export type GetLibraryAlbumResponse = z.infer<
  typeof GetLibraryAlbumResponseSchema
>;
