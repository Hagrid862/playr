import { z } from "zod";
import { createApiResponseSchema } from "../../api";
import { ImageSchema } from "../../schemas";

export const UploadLibraryAlbumCoverResponseSchema =
  createApiResponseSchema(ImageSchema);

export type UploadLibraryAlbumCoverResponse = z.infer<
  typeof UploadLibraryAlbumCoverResponseSchema
>;
