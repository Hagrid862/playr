import { z } from "zod";
import { createApiResponseSchema } from "../api";
import { LibrarySchema } from "../schemas";

export const CreateLibraryRequestSchema = z.object({}).strict()

export type CreateLibraryRequestDto = z.infer<typeof CreateLibraryRequestSchema>;


export const CreateLibraryResponseSchema = createApiResponseSchema(
  LibrarySchema
)

export type CreateLibraryResponseDto = z.infer<typeof CreateLibraryResponseSchema>;