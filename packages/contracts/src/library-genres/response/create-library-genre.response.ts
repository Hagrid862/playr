import { z } from "zod";
import { createApiResponseSchema } from "../../api";
import { GenreSchema } from "../../schemas";

export const CreateLibraryGenreResponseSchema =
  createApiResponseSchema(GenreSchema);

export type CreateLibraryGenreResponse = z.infer<
  typeof CreateLibraryGenreResponseSchema
>;
