import { z } from "zod";

export const GetQueueStateRequestSchema = z.object({}).strict();

export type GetQueueStateRequest = z.infer<typeof GetQueueStateRequestSchema>;
