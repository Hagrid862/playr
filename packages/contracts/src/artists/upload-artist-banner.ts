import { z } from "zod";
import { createApiResponseSchema } from "../api";
import { ImageSchema } from "../schemas";

export const UploadArtistBannerRequestSchema = z.object({
  file: z.any().describe("Binary image file"),
});

export type UploadArtistBannerRequest = z.infer<
  typeof UploadArtistBannerRequestSchema
>;

export const UploadArtistBannerResponseSchema =
  createApiResponseSchema(ImageSchema);

export type UploadArtistBannerResponse = z.infer<
  typeof UploadArtistBannerResponseSchema
>;
