import { z } from "zod";
import { createApiResponseSchema } from "../../api";
import { TrackSchema } from "../../schemas";

export const DeleteLibraryTrackResponseSchema =
  createApiResponseSchema(TrackSchema);

export type DeleteLibraryTrackResponse = z.infer<
  typeof DeleteLibraryTrackResponseSchema
>;
