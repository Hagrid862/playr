import { createMock } from "@golevelup/ts-vitest";
import type { ExecutionContext } from "@nestjs/common";
import type { HttpArgumentsHost } from "@nestjs/common/interfaces";

export interface MockExecutionContextOptions<TRequest = any> {
  /** Handler returned by getHandler() - use a real function for assertion-friendly tests */
  handler?: () => void;
  /** Override switchToHttp().getRequest() response */
  request?: TRequest;
}

/**
 * Creates a mock ExecutionContext for guard/interceptor tests.
 * Uses a plain function for getHandler() to avoid Vitest proxy comparison issues.
 */
export function createMockExecutionContext<TRequest = any>(
  options: MockExecutionContextOptions<TRequest> = {},
): ExecutionContext {
  const handler = options.handler ?? vi.fn();
  const request =
    options.request ??
    ({
      params: {},
      user: { user: { id: "userId" } },
    } as unknown as TRequest);

  return createMock<ExecutionContext>({
    getHandler: vi.fn().mockReturnValue(handler),
    switchToHttp: vi.fn().mockReturnValue(
      createMock<HttpArgumentsHost>({
        getRequest: vi.fn().mockReturnValue(request),
      }),
    ),
  });
}
