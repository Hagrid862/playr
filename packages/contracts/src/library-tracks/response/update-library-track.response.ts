import { z } from "zod";
import { createApiResponseSchema } from "../../api";
import { TrackSchema } from "../../schemas";

export const UpdateLibraryTrackResponseSchema =
  createApiResponseSchema(TrackSchema);

export type UpdateLibraryTrackResponse = z.infer<
  typeof UpdateLibraryTrackResponseSchema
>;
