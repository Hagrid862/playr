import { z } from "zod";
import { createApiResponseSchema } from "../../api";

export const LibraryStorageUsageSchema = z.object({
  usedBytes: z.number().int().nonnegative(),
  limitBytes: z.number().int().positive(),
  remainingBytes: z.number().int().nonnegative(),
  usedPercent: z.number().int().min(0).max(100),
  limitSource: z.enum(["default", "override"]),
});

export const GetLibraryStorageUsageResponseSchema = createApiResponseSchema(
  LibraryStorageUsageSchema,
);

export type LibraryStorageUsage = z.infer<typeof LibraryStorageUsageSchema>;
export type GetLibraryStorageUsageResponse = z.infer<
  typeof GetLibraryStorageUsageResponseSchema
>;
