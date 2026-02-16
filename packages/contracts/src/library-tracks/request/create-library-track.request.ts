import { z } from "zod";
import { zodRequiredString } from "../../utils/zod-shared";

export const CreateLibraryTrackRequestSchema = z.object({
  title: zodRequiredString("Track title is required").pipe(
    z
      .string()
      .min(1, "Track title is required")
      .max(255, "Track title must be 255 characters or less"),
  ),
  albumId: zodRequiredString("Album ID is required"),
  trackNumber: z.number().int().min(1).default(1),
  diskNumber: z.number().int().min(1).default(1),
  explicit: z.boolean().default(false),
  artistIds: z.array(z.string()).min(1, "At least one artist is required"),
});

export type CreateLibraryTrackRequest = z.infer<
  typeof CreateLibraryTrackRequestSchema
>;
