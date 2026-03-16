import {
  rand,
  randFileName,
  randPastDate,
  randText,
  randUrl,
  randUuid,
} from "@ngneat/falso";
import { FileBucket, ImageUploadStatus, type Image } from "@repo/db";

export function imageBuilder(overrides?: Partial<Image>): Image {
  return {
    id: randUuid(),
    alt: randText({ charCount: 25 }),
    bucket: rand([FileBucket.private, FileBucket.public]),
    key: randFileName({ extension: "jpg" }),
    url: randUrl(),
    mimeType: "image/jpeg",
    blurhash: null,
    reportId: null,
    uploadStatus: rand([
      ImageUploadStatus.pending,
      ImageUploadStatus.processing,
      ImageUploadStatus.uploaded,
      ImageUploadStatus.failed,
    ]),
    createdAt: randPastDate(),
    updatedAt: randPastDate(),
    deletedAt: null,
    ...overrides,
  };
}
