import { z } from "zod";
import { createApiResponseSchema } from "../../api";
import { DeletedGenreSchema } from "../../schemas/genre.schema";

export const DeleteLibraryGenreResponseSchema =
  createApiResponseSchema(DeletedGenreSchema);

export type DeleteLibraryGenreResponse = z.infer<
  typeof DeleteLibraryGenreResponseSchema
>;
