import { z } from "zod";

export const UploadLibraryArtistBannerRequestSchema = z.object({
  file: z.any(),
});

export type UploadLibraryArtistBannerRequest = z.infer<
  typeof UploadLibraryArtistBannerRequestSchema
>;
