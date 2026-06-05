import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DEFAULT_TEST_PASSWORD = "Password123!";

export const TEST_AUDIO_PATH = path.resolve(
  __dirname,
  "../../ui-tests/assets/test-audio.mp3",
);

export const TEST_IMAGE_PATH = path.resolve(
  __dirname,
  "../../ui-tests/assets/test-image.jpg",
);

export function uniqueSuffix(): number {
  return Date.now() + Math.floor(Math.random() * 100_000);
}

export function uniqueUsername(prefix: string): string {
  const base = prefix
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 12);
  const id = String(uniqueSuffix() % 1_000_000_000);
  return `${base}_${id}`.slice(0, 32);
}

export function uniqueEmail(prefix: string): string {
  const sanitized =
    prefix
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "")
      .slice(0, 32) || "user";
  return `${sanitized}_${uniqueSuffix()}@example.com`;
}

export function uniqueLabel(prefix: string): string {
  return `${prefix} ${uniqueSuffix()}`;
}
