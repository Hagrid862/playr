import { z } from "zod";

/** Body for `command:presence-touch` (optional empty object). */
export const PresenceTouchRequestSchema = z.object({}).strict();

export type PresenceTouchRequest = z.infer<typeof PresenceTouchRequestSchema>;
