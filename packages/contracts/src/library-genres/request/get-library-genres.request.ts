import { GenreKind } from "@repo/db";
import { z } from "zod";

export const GetLibraryGenresRequestSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  query: z.string().min(1).optional(),
  kind: z.enum(GenreKind).optional(),
});

export type GetLibraryGenresRequest = z.infer<
  typeof GetLibraryGenresRequestSchema
>;
