import { FileBucket, ImageUploadStatus, type Image } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";
import {
  ImageVariantSchema,
  type ZodImageVariant,
} from "./image-variant.schema";

export interface ZodImage extends Image {
  variants?: ZodImageVariant[];
}

export const ImageSchema: z.ZodType<ZodImage> = z.object({
  id: z.string(),
  alt: z.string().nullable(),
  bucket: z.enum(FileBucket),
  key: z.string(),
  url: z.string().nullable(),
  mimeType: z.string(),
  blurhash: z.string().nullable(),
  reportId: z.string().nullable(),
  uploadStatus: z.enum(ImageUploadStatus),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  deletedAt: zodDateTimeNullable(),

  variants: z.array(z.lazy(() => ImageVariantSchema)).optional(),
});

export type ZodImageInfer = z.infer<typeof ImageSchema>;
