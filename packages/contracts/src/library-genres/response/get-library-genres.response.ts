import { z } from "zod";
import { createApiResponseSchema } from "../../api";
import { GenreSchema } from "../../schemas";

export const GetLibraryGenresResponseSchema = createApiResponseSchema(
  z.object({
    items: z.array(GenreSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
);

export type GetLibraryGenresResponse = z.infer<
  typeof GetLibraryGenresResponseSchema
>;
