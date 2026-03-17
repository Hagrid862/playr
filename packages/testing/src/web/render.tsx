import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { render, type RenderOptions } from "@testing-library/react";
import { useMemo, type ReactElement, type ReactNode } from "react";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function createTestRouter(ui: ReactNode, initialLocation = "/") {
  const rootRoute = createRootRoute({
    component: () => <Outlet />,
  });

  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <>{ui}</>,
  });

  const routeTree = rootRoute.addChildren([indexRoute]);

  return createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: [initialLocation],
    }),
    defaultPendingMinMs: 0,
  });
}

export interface CustomRenderOptions<
  TRouterContext extends Record<string, unknown> = Record<string, unknown>,
> extends Omit<RenderOptions, "wrapper"> {
  queryClient?: QueryClient;
  /** Initial URL for the in-memory router. Defaults to "/". */
  initialLocation?: string;
  /** Context passed to RouterProvider. Use when your app expects router context (e.g. auth). */
  routerContext?: TRouterContext;
}

/**
 * Renders a component with QueryClientProvider and RouterProvider.
 * Use for tests that need React Query and/or TanStack Router (useNavigate, useParams, Link, etc.).
 *
 * @example
 * ```tsx
 * import { customRender } from '@repo/testing/web';
 * customRender(<MyComponent />);
 *
 * // With initial location
 * customRender(<MyComponent />, { initialLocation: '/' });
 *
 * // With router context (e.g. auth)
 * customRender(<MyComponent />, { routerContext: { auth: mockAuth } });
 * ```
 */
export function customRender<
  TRouterContext extends Record<string, unknown> = Record<string, unknown>,
>(
  ui: ReactElement,
  options: CustomRenderOptions<TRouterContext> = {},
): ReturnType<typeof render> {
  const {
    queryClient = createTestQueryClient(),
    initialLocation = "/",
    routerContext,
    ...renderOptions
  } = options;

  const Wrapper = ({ children }: { children: ReactNode }) => {
    const router = useMemo(
      () => createTestRouter(children, initialLocation),
      [children, initialLocation],
    );
    return (
      <QueryClientProvider client={queryClient}>
        <RouterProvider
          router={router}
          {...(routerContext && { context: routerContext })}
        />
      </QueryClientProvider>
    );
  };

  return render(ui, {
    ...renderOptions,
    wrapper: Wrapper,
  });
}
