import { z } from "zod";
import { zodRequiredString } from "../../utils/zod-shared";

export const UploadTrackAudioRequestSchema = z.object({
  trackId: zodRequiredString("Track ID is required"),
});

export type UploadTrackAudioRequest = z.infer<
  typeof UploadTrackAudioRequestSchema
>;
