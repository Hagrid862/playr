import { z } from "zod";
import { createApiResponseSchema } from "../../api";
import { AudioFileSchema } from "../../schemas";

export const BulkUploadTrackAudioResponseSchema = createApiResponseSchema(
  z.object({
    audioFiles: z.array(AudioFileSchema),
  }),
);

export type BulkUploadTrackAudioResponse = z.infer<
  typeof BulkUploadTrackAudioResponseSchema
>;
