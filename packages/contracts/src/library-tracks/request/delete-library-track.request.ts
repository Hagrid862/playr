import { z } from "zod";

export const DeleteLibraryTrackRequestSchema = z.object({});

export type DeleteLibraryTrackRequest = z.infer<
  typeof DeleteLibraryTrackRequestSchema
>;
