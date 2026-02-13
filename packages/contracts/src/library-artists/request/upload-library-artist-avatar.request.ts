import { z } from "zod";

export const UploadLibraryArtistAvatarRequestSchema = z.object({
  file: z.any(),
});

export type UploadLibraryArtistAvatarRequest = z.infer<
  typeof UploadLibraryArtistAvatarRequestSchema
>;
