import { Visibility } from "@repo/db";
import { z } from "zod";

export const UpdateLibraryTrackRequestSchema = z.object({
  title: z
    .string()
    .min(1, "Track title cannot be empty")
    .max(255, "Track title must be 255 characters or less")
    .optional(),
  trackNumber: z.number().int().min(1).optional(),
  diskNumber: z.number().int().min(1).optional(),
  duration: z.number().int().min(0).optional(),
  explicit: z.boolean().optional(),
  lyrics: z.string().max(10000).optional(),
  visibility: z.enum(Visibility).optional(),
  artistIds: z.array(z.string()).min(1).optional(),
  /** When set (including `[]`), replaces all track genres. Omit to leave genres unchanged. */
  genreIds: z.array(z.string()).optional(),
});

export type UpdateLibraryTrackRequest = z.infer<
  typeof UpdateLibraryTrackRequestSchema
>;
