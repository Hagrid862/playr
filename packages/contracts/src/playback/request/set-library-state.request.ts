import { z } from "zod";

export const SetLibraryStateRequestSchema = z
  .object({
    inLibrary: z.boolean(),
    expectedVersion: z.number().int().min(0).default(0),
  })
  .strict();

export type SetLibraryStateRequest = z.infer<
  typeof SetLibraryStateRequestSchema
>;
