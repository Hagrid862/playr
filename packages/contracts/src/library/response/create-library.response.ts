import { z } from "zod";
import { createApiResponseSchema } from "../../api";
import { LibrarySchema } from "../../schemas";

export const CreateLibraryResponseSchema =
  createApiResponseSchema(LibrarySchema);

export type CreateLibraryResponse = z.infer<typeof CreateLibraryResponseSchema>;
