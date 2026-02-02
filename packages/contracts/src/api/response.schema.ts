import z from "zod";

export const MetaSchema = z
  .object({
    timestamp: z.string(),
    requestId: z.string(),
    path: z.string(),
    duration: z.string().optional(),
  })
  .loose();

export const ErrorSchema = z.object({
  statusCode: z.number(),
  message: z.union([z.string(), z.record(z.string(), z.unknown())]),
});

export const createApiResponseSchema = <T extends z.ZodTypeAny>(
  dataSchema: T,
) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    error: z.null(),
    meta: MetaSchema,
  });

export const ApiFailureResponseSchema = z.object({
  success: z.literal(false),
  data: z.null(),
  error: ErrorSchema,
  meta: MetaSchema,
});
