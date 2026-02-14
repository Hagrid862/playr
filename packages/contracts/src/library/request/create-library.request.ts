import { z } from "zod";

export const CreateLibraryRequestSchema = z.object({}).strict();

export type CreateLibraryRequest = z.infer<typeof CreateLibraryRequestSchema>;
