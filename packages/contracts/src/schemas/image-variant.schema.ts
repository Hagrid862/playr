import { FileBucket, ImageVariantType, type ImageVariant } from "@repo/db";
import z from "zod";
import { zodDateTime } from "../utils/zod-datetime";
import { ImageSchema, type ZodImage } from "./image.schema";

export interface ZodImageVariant extends ImageVariant {
  image?: ZodImage;
}

export const ImageVariantSchema: z.ZodType<ZodImageVariant> = z.object({
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

  image: z.lazy(() => ImageSchema).optional(),
});

export type ZodImageVariantInfer = z.infer<typeof ImageVariantSchema>;
