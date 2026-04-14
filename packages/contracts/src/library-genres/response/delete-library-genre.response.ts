import { z } from "zod";
import { createApiResponseSchema } from "../../api";
import { GenreSchema } from "../../schemas";

export const DeleteLibraryGenreResponseSchema =
  createApiResponseSchema(GenreSchema);

export type DeleteLibraryGenreResponse = z.infer<
  typeof DeleteLibraryGenreResponseSchema
>;
