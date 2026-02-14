import { z } from "zod";

export const GetLibraryRequestSchema = z.object({}).strict();

export type GetLibraryRequest = z.infer<typeof GetLibraryRequestSchema>;
