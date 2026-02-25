import { z } from "zod";
import { zodRequiredString } from "../../utils/zod-shared";

const BulkCreateLibraryTrackItemSchema = z.object({
  title: zodRequiredString("Track title is required").pipe(
    z
      .string()
      .min(1, "Track title is required")
      .max(255, "Track title must be 255 characters or less"),
  ),
  trackNumber: z.number().int().min(1).default(1),
  diskNumber: z.number().int().min(1).default(1),
  explicit: z.boolean().default(false),
  artistIds: z.array(z.string()).min(1, "At least one artist is required"),
});

export const BulkCreateLibraryTracksRequestSchema = z.object({
  tracks: z
    .array(BulkCreateLibraryTrackItemSchema)
    .min(1, "At least one track is required")
    .max(50, "Maximum 50 tracks per bulk create"),
});

export type BulkCreateLibraryTrackItem = z.infer<
  typeof BulkCreateLibraryTrackItemSchema
>;
export type BulkCreateLibraryTracksRequest = z.infer<
  typeof BulkCreateLibraryTracksRequestSchema
>;
