import { z } from "zod";
import { createApiResponseSchema } from "../api";
import { ImageSchema } from "../schemas";

export const UploadAlbumCoverRequestSchema = z.object({
  file: z.any().describe("Binary image file"),
});

export type UploadAlbumCoverRequest = z.infer<
  typeof UploadAlbumCoverRequestSchema
>;

export const UploadAlbumCoverResponseSchema =
  createApiResponseSchema(ImageSchema);

export type UploadAlbumCoverResponse = z.infer<
  typeof UploadAlbumCoverResponseSchema
>;
