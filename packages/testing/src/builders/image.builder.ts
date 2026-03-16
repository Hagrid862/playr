import {
  rand,
  randBetweenDate,
  randFileName,
  randPastDate,
  randText,
  randUrl,
  randUuid,
} from "@ngneat/falso";
import { FileBucket, ImageUploadStatus, type Image } from "@repo/db";

export function imageBuilder(overrides?: Partial<Image>): Image {
  const createdAt = randPastDate();
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
    createdAt,
    updatedAt: randBetweenDate({ from: createdAt, to: new Date() }),
    deletedAt: null,
    ...overrides,
  };
}
