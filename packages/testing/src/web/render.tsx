import type { ReactElement, ReactNode } from "react";
import {
  render as rtlRender,
  type RenderOptions,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export interface RenderWithProvidersOptions extends Omit<
  RenderOptions,
  "wrapper"
> {
  /** Custom QueryClient. Defaults to a new client with retries disabled. */
  queryClient?: QueryClient;
  /** Additional wrapper component. Applied inside QueryClientProvider. */
  wrapper?: React.ComponentType<{ children: ReactNode }>;
}

const defaultQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

/**
 * Renders a React component with common test providers (QueryClient).
 * Pass a custom wrapper for app-specific providers (e.g. TooltipProvider, Router).
 */
export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {},
): ReturnType<typeof rtlRender> {
  const {
    queryClient = defaultQueryClient,
    wrapper: InnerWrapper,
    ...renderOptions
  } = options;

  const Wrapper = ({ children }: { children: ReactNode }) => {
    const content = InnerWrapper ? (
      <InnerWrapper>{children}</InnerWrapper>
    ) : (
      children
    );
    return (
      <QueryClientProvider client={queryClient}>{content}</QueryClientProvider>
    );
  };

  return rtlRender(ui, {
    wrapper: Wrapper,
    ...renderOptions,
  });
}
