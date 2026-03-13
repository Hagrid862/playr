/// <reference types="multer" />
import { createMock } from "@golevelup/ts-vitest";
import type { Request, Response } from "express";

export interface MockExpressRequestOptions {
  user?: unknown;
  cookies?: Record<string, string>;
  query?: Record<string, string>;
}

/**
 * Creates a type-safe mock Express Request for controller tests.
 */
export function createMockExpressRequest(
  options: MockExpressRequestOptions = {},
): Request {
  const mock = createMock<Request>();
  return Object.assign(mock, {
    user: options.user,
    cookies: options.cookies ?? {},
    query: options.query ?? {},
  }) as Request;
}

/**
 * Creates a type-safe mock Express Response for controller tests.
 * Includes clearCookie and cookie as vi.fn() for assertions.
 */
export function createMockExpressResponse(): Response {
  return createMock<Response>({
    clearCookie: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
  });
}

export interface MockMulterFileOptions {
  buffer?: Buffer;
  fieldname?: string;
  originalname?: string;
  mimetype?: string;
  size?: number;
  stream?: NodeJS.ReadableStream | null;
}

/**
 * Creates a type-safe mock Express.Multer.File for controller/handler tests.
 */
export function createMockMulterFile(
  options: MockMulterFileOptions = {},
): Express.Multer.File {
  const mock = createMock<Express.Multer.File>();
  return Object.assign(mock, {
    buffer: options.buffer ?? Buffer.from("test"),
    fieldname: options.fieldname ?? "file",
    originalname: options.originalname ?? "test-file.mp3",
    mimetype: options.mimetype ?? "audio/mpeg",
    size: options.size ?? 1024,
    encoding: "7bit",
    destination: "",
    filename: "",
    path: "",
    stream: options.stream ?? null,
    ...options,
  }) as Express.Multer.File;
}
