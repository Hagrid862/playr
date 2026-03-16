import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";

const defaultQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

export interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  queryClient?: QueryClient;
}

/**
 * Renders a component with QueryClientProvider. Use for tests that need React Query.
 *
 * @example
 * ```tsx
 * import { customRender } from '@repo/testing/web';
 * customRender(<MyComponent />);
 * ```
 */
export function customRender(
  ui: ReactElement,
  options: CustomRenderOptions = {},
): ReturnType<typeof render> {
  const { queryClient = defaultQueryClient, ...renderOptions } = options;

  return render(ui, {
    ...renderOptions,
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
}
