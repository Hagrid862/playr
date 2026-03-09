import { z } from "zod";
import { createApiResponseSchema } from "../../api";
import { TrackSchema } from "../../schemas";

export const CreateLibraryTrackResponseSchema =
  createApiResponseSchema(TrackSchema);

export type CreateLibraryTrackResponse = z.infer<
  typeof CreateLibraryTrackResponseSchema
>;
