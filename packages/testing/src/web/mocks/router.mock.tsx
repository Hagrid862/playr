import type { ReactNode } from "react";

export interface RouterMockOptions {
  mockNavigate?: ReturnType<typeof import("vitest").vi.fn>;
  mockUseRouter?: () => Record<string, unknown>;
}

/**
 * Creates a mock for @tanstack/react-router. Pass vi from your test.
 *
 * @example
 * ```ts
 * import { createRouterMock } from '@repo/testing/web';
 * import { vi } from 'vitest';
 *
 * vi.mock('@tanstack/react-router', () => createRouterMock(vi));
 * ```
 */
export function createRouterMock(
  vi: { fn: () => unknown },
  options: RouterMockOptions = {},
): Record<string, unknown> {
  const mockNavigate = options.mockNavigate ?? vi.fn();
  const useRouter = options.mockUseRouter ?? (() => ({ navigate: mockNavigate }));

  return {
    Link: ({
      children,
      to,
      params,
    }: {
      children: ReactNode;
      to: string;
      params?: Record<string, string | number | boolean | undefined | null>;
    }) => (
      <a href={to} data-params={params ? JSON.stringify(params) : undefined}>
        {children}
      </a>
    ),
    useNavigate: () => mockNavigate,
    useRouter,
  };
}