import { FileBucket, ImageUploadStatus, type Image } from "@repo/db";
import { TEST_IDS } from "./constants";

export function imageBuilder(overrides?: Partial<Image>): Image {
  const now = new Date();
  return {
    id: TEST_IDS.image,
    alt: "Test Image",
    bucket: FileBucket.private,
    key: "test-key.jpg",
    url: "https://test.com/test-key.jpg",
    mimeType: "image/jpeg",
    blurhash: null,
    reportId: null,
    uploadStatus: ImageUploadStatus.pending,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}
