import { z } from "zod";

export const UploadLibraryAlbumCoverRequestSchema = z.object({
  file: z.any().describe("Binary image file"),
});

export type UploadLibraryAlbumCoverRequest = z.infer<
  typeof UploadLibraryAlbumCoverRequestSchema
>;
