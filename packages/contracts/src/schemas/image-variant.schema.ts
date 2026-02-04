import { FileBucket, ImageVariantType, type ImageVariant } from "@repo/db";
import z from "zod";
import { zodDateTime } from "../utils/zod-datetime";

export const ImageVariantSchema = z.object({
  id: z.string(),
  type: z.enum(ImageVariantType),
  bucket: z.enum(FileBucket),
  key: z.string(),
  url: z.string().nullable(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  size: z.number().int(),
  imageId: z.string(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
}) satisfies z.ZodType<ImageVariant>;

export type ZodImageVariant = z.infer<typeof ImageVariantSchema>;
