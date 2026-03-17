/// <reference types="multer" />

import { Readable } from "node:stream";

/**
 * Creates a mock Express.Multer.File for upload handler tests.
 * Use this instead of defining createMockFile locally in spec files.
 */
export function createMockFile(
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File {
  const base: Express.Multer.File = {
    buffer: Buffer.from("test audio content"),
    mimetype: "audio/mpeg",
    originalname: "test-song.mp3",
    size: 1024,
    fieldname: "file",
    encoding: "7bit",
    destination: "",
    filename: "",
    path: "",
    stream: Readable.from(Buffer.from("test audio content")),
  };

  return {
    ...base,
    ...overrides,
  };
}
