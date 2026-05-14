import { z } from "zod";
import { createApiResponseSchema } from "../../api";
import { GenreSchema } from "../../schemas";

export const GetLibraryGenresResponseSchema = createApiResponseSchema(
  z.object({
    items: z.array(GenreSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
  }),
);

export type GetLibraryGenresResponse = z.infer<
  typeof GetLibraryGenresResponseSchema
>;
