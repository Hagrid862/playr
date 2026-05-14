import { z } from "zod";
import { createApiResponseSchema } from "../../api";
import { GenreSchema } from "../../schemas";

export const UpdateLibraryGenreResponseSchema =
  createApiResponseSchema(GenreSchema);

export type UpdateLibraryGenreResponse = z.infer<
  typeof UpdateLibraryGenreResponseSchema
>;
