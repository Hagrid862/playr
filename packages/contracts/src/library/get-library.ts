import { z } from "zod";
import { createApiResponseSchema } from "../api";
import { LibrarySchema } from "../schemas";

export const GetLibraryRequestSchema = z.object({}).strict();

export type GetLibraryRequestDto = z.infer<typeof GetLibraryRequestSchema>;

export const GetLibraryResponseSchema = createApiResponseSchema(LibrarySchema);

export type GetLibraryResponseDto = z.infer<typeof GetLibraryResponseSchema>;
