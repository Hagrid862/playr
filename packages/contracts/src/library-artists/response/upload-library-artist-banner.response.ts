import { z } from "zod";
import { createApiResponseSchema } from "../../api";
import { ImageSchema } from "../../schemas";

export const UploadLibraryArtistBannerResponseSchema =
  createApiResponseSchema(ImageSchema);

export type UploadLibraryArtistBannerResponse = z.infer<
  typeof UploadLibraryArtistBannerResponseSchema
>;
