/// <reference types="vitest/globals" />
import { createMock } from "@golevelup/ts-vitest";

/**
 * Creates a type-safe mock Response for fetch.
 */
function createMockResponse(init: {
  ok?: boolean;
  status?: number;
  statusText?: string;
  json?: () => Promise<unknown>;
}): Response {
  return createMock<Response>({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: init.statusText ?? "OK",
    json: init.json ?? (async () => ({})),
  });
}

/**
 * Mocks fetch to return a JSON response. Type-safe for the response body.
 */
export function mockFetchWithJson<T>(
  response: T,
  init: { status?: number; statusText?: string } = {},
): void {
  const json = async () => response;
  globalThis.fetch = vi.fn().mockResolvedValue(
    createMockResponse({
      ok: (init.status ?? 200) >= 200 && (init.status ?? 200) < 300,
      status: init.status ?? 200,
      statusText: init.statusText ?? "OK",
      json,
    }),
  );
}

/**
 * Mocks fetch to return a 4xx/5xx error response.
 */
export function mockFetchError(
  init: {
    status?: number;
    statusText?: string;
    body?: unknown;
  } = {},
): void {
  const status = init.status ?? 500;
  const body = init.body ?? { message: init.statusText ?? "Error" };
  globalThis.fetch = vi.fn().mockResolvedValue(
    createMockResponse({
      ok: false,
      status,
      statusText: init.statusText ?? "Error",
      json: async () => body,
    }),
  );
}

/**
 * Resets the fetch mock. Call in afterEach.
 */
export function resetFetchMock(): void {
  vi.restoreAllMocks();
}
