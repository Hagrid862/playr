import { z } from "zod";
import { AudioFileSchema } from "../../schemas/audio-file.schema";

export const UploadTrackAudioResponseSchema = z.object({
  audioFile: AudioFileSchema,
});

export type UploadTrackAudioResponse = z.infer<
  typeof UploadTrackAudioResponseSchema
>;
