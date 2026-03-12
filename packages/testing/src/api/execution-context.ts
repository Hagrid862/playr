import { createMock } from '@golevelup/ts-vitest';
import type { ExecutionContext } from '@nestjs/common';
import type { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { vi } from 'vitest';

export interface MockExecutionContextOptions {
  /** Handler returned by getHandler() - use a real function for assertion-friendly tests */
  handler?: () => void;
  /** Override switchToHttp().getRequest() response */
  request?: {
    params?: Record<string, string>;
    user?: { user: { id: string } };
  };
}

/**
 * Creates a mock ExecutionContext for guard/interceptor tests.
 * Uses a plain function for getHandler() to avoid Vitest proxy comparison issues.
 */
export function createMockExecutionContext(
  options: MockExecutionContextOptions = {},
): ExecutionContext {
  const handler = options.handler ?? vi.fn();
  const request = options.request ?? {
    params: {},
    user: { user: { id: 'userId' } },
  };

  return createMock<ExecutionContext>({
    getHandler: vi.fn().mockReturnValue(handler),
    switchToHttp: vi.fn().mockReturnValue(
      createMock<HttpArgumentsHost>({
        getRequest: vi.fn().mockReturnValue(request),
      }),
    ),
  });
}
