import { z } from "zod";
import { createApiResponseSchema } from "../../api";
import { ImageSchema } from "../../schemas";

export const UploadLibraryArtistAvatarResponseSchema =
  createApiResponseSchema(ImageSchema);

export type UploadLibraryArtistAvatarResponse = z.infer<
  typeof UploadLibraryArtistAvatarResponseSchema
>;
