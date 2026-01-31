import { FileBucket, ImageUploadStatus, type Image } from "@repo/db";
import z from "zod";

export const ImageSchema = z.object({
  id: z.string(),
  alt: z.string().nullable(),
  bucket: z.enum(FileBucket),
  key: z.string(),
  url: z.string().nullable(),
  mimeType: z.string(),
  blurhash: z.string().nullable(),
  reportId: z.string().nullable(),
  uploadStatus: z.enum(ImageUploadStatus),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
}) satisfies z.ZodType<Image>;

export type ZodImage = z.infer<typeof ImageSchema>;
