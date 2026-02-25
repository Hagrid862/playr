import { z } from "zod";

/**
 * Schema for validating trackIds form field in bulk upload multipart request.
 * The actual files are sent as multipart 'files' field.
 * Order of trackIds must match order of files.
 */
export const BulkUploadTrackAudioRequestSchema = z.object({
  trackIds: z
    .array(z.string().min(1, "Track ID is required"))
    .min(1, "At least one track ID is required")
    .max(50, "Maximum 50 files per bulk upload"),
});

export type BulkUploadTrackAudioRequest = z.infer<
  typeof BulkUploadTrackAudioRequestSchema
>;
