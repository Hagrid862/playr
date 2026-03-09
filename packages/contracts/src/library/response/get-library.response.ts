import { z } from "zod";
import { createApiResponseSchema } from "../../api";
import { LibrarySchema } from "../../schemas";

export const GetLibraryResponseSchema = createApiResponseSchema(LibrarySchema);

export type GetLibraryResponse = z.infer<typeof GetLibraryResponseSchema>;
