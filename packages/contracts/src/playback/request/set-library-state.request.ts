import { z } from "zod";

export const SetLibraryStateRequestSchema = z
  .object({
    libraryId: z.string(),
    expectedVersion: z.number().int().min(0).default(0),
  })
  .strict();

export type SetLibraryStateRequest = z.infer<
  typeof SetLibraryStateRequestSchema
>;
