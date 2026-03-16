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
import type { ReactElement } from "react";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function createTestRouter(ui: ReactElement, initialLocation = "/") {
  const rootRoute = createRootRoute({
    component: () => <Outlet />,
  });

  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => ui,
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

export interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  queryClient?: QueryClient;
  /** Initial URL for the in-memory router. Defaults to "/". */
  initialLocation?: string;
  /** Context passed to RouterProvider. Use when your app expects router context (e.g. auth). */
  routerContext?: Record<string, unknown>;
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
 * customRender(<MyComponent />, { initialLocation: '/albums/123' });
 *
 * // With router context (e.g. auth)
 * customRender(<MyComponent />, { routerContext: { auth: mockAuth } });
 * ```
 */
export function customRender(
  ui: ReactElement,
  options: CustomRenderOptions = {},
): ReturnType<typeof render> {
  const {
    queryClient = createTestQueryClient(),
    initialLocation = "/",
    routerContext,
    ...renderOptions
  } = options;

  const router = createTestRouter(ui, initialLocation);

  return render(ui, {
    ...renderOptions,
    wrapper: () => (
      <QueryClientProvider client={queryClient}>
        <RouterProvider
          router={router}
          {...(routerContext && { context: routerContext })}
        />
      </QueryClientProvider>
    ),
  });
}
