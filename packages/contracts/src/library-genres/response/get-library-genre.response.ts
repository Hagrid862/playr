import { z } from "zod";
import { createApiResponseSchema } from "../../api";
import { GenreSchema } from "../../schemas";

export const GetLibraryGenreResponseSchema =
  createApiResponseSchema(GenreSchema);

export type GetLibraryGenreResponse = z.infer<
  typeof GetLibraryGenreResponseSchema
>;
