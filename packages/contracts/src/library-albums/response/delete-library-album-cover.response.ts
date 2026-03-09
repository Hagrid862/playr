import { z } from "zod";
import { createApiResponseSchema } from "../../api";
import { AlbumSchema } from "../../schemas";

export const DeleteLibraryAlbumCoverResponseSchema =
  createApiResponseSchema(AlbumSchema);

export type DeleteLibraryAlbumCoverResponse = z.infer<
  typeof DeleteLibraryAlbumCoverResponseSchema
>;
