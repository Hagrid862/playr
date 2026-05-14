import { z } from "zod";

export const SetActiveDeviceRequestSchema = z
  .object({
    deviceId: z.string().min(1),
    expectedVersion: z.number().int().min(1),
  })
  .strict();

export type SetActiveDeviceRequest = z.infer<typeof SetActiveDeviceRequestSchema>;
