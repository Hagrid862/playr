import { z } from "zod";
import { createApiResponseSchema } from "../api";
import { ImageSchema } from "../schemas";

export const UploadArtistAvatarRequestSchema = z.object({
  file: z.any().describe("Binary image file"),
});

export type UploadArtistAvatarRequest = z.infer<
  typeof UploadArtistAvatarRequestSchema
>;

export const UploadArtistAvatarResponseSchema =
  createApiResponseSchema(ImageSchema);

export type UploadArtistAvatarResponse = z.infer<
  typeof UploadArtistAvatarResponseSchema
>;
