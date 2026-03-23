import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import {
  render,
  renderHook,
  type RenderHookOptions,
  type RenderOptions,
} from "@testing-library/react";
import { type ComponentType, type ReactElement, type ReactNode } from "react";

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

export interface WebTestProviderOptions {
  queryClient?: QueryClient;
}

export interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  queryClient?: QueryClient;
}

export interface CustomRenderWithRouterOptions<
  TRouterContext extends Record<string, unknown> = Record<string, unknown>,
> extends CustomRenderOptions {
  /** Initial URL for the in-memory router. Defaults to "/". */
  initialLocation?: string;
  /** Context passed to RouterProvider. Use when your app expects router context (e.g. auth). */
  routerContext?: TRouterContext;
}

export type CustomRenderHookOptions<TProps> = Omit<
  RenderHookOptions<TProps>,
  "wrapper"
> &
  WebTestProviderOptions & {
    /**
     * Renders inside QueryClientProvider (after that provider).
     * Use for extra context (e.g. a form or theme provider).
     */
    wrapper?: RenderHookOptions<TProps>["wrapper"];
  };

export type CustomRenderHookWithRouterOptions<
  TProps,
  TRouterContext extends Record<string, unknown> = Record<string, unknown>,
> = CustomRenderHookOptions<TProps> & {
  initialLocation?: string;
  routerContext?: TRouterContext;
};

function createQueryClientWrapper(options: {
  queryClient: QueryClient;
}): ComponentType<{ children: ReactNode }> {
  const { queryClient } = options;
  return function QueryClientWrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function createRouterTestWrapper<
  TRouterContext extends Record<string, unknown> = Record<string, unknown>,
>(options: {
  queryClient: QueryClient;
  initialLocation: string;
  routerContext?: TRouterContext;
}): ComponentType<{ children: ReactNode }> {
  const { queryClient, initialLocation, routerContext } = options;

  return function RouterTestWrapper({ children }: { children: ReactNode }) {
    const router = createTestRouter(children, initialLocation);
    return (
      <QueryClientProvider client={queryClient}>
        <RouterProvider
          router={router}
          {...(routerContext && { context: routerContext })}
        />
      </QueryClientProvider>
    );
  };
}

/**
 * Renders a component with QueryClientProvider (React Query).
 * Use for most UI tests. Router hooks and `<Link>` need {@link customRenderWithRouter}.
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
  const { queryClient = createTestQueryClient(), ...renderOptions } = options;

  const Wrapper = createQueryClientWrapper({ queryClient });

  return render(ui, {
    ...renderOptions,
    wrapper: Wrapper,
  });
}

/**
 * Renders with QueryClientProvider and an in-memory TanStack Router.
 * Route content mounts asynchronously; use `findBy*` / `waitFor` when asserting outlet content.
 *
 * If the test file uses `vi.mock('@tanstack/react-router', ...)`, use a partial mock with
 * `importOriginal` so real `RouterProvider` / `createRouter` remain available to this helper.
 *
 * @example
 * ```tsx
 * customRenderWithRouter(<MyPage />, { initialLocation: '/albums/123' });
 * customRenderWithRouter(<MyPage />, { routerContext: { auth: mockAuth } });
 * ```
 */
export function customRenderWithRouter<
  TRouterContext extends Record<string, unknown> = Record<string, unknown>,
>(
  ui: ReactElement,
  options: CustomRenderWithRouterOptions<TRouterContext> = {},
): ReturnType<typeof render> {
  const {
    queryClient = createTestQueryClient(),
    initialLocation = "/",
    routerContext,
    ...renderOptions
  } = options;

  const Wrapper = createRouterTestWrapper<TRouterContext>({
    queryClient,
    initialLocation,
    routerContext,
  });

  return render(ui, {
    ...renderOptions,
    wrapper: Wrapper,
  });
}

/**
 * Runs a hook with QueryClientProvider (same defaults as {@link customRender}).
 */
export function customRenderHook<TResult, TProps>(
  callback: (props: TProps) => TResult,
  options: CustomRenderHookOptions<TProps> = {},
) {
  const {
    queryClient = createTestQueryClient(),
    wrapper: UserWrapper,
    ...hookOptions
  } = options;

  const Providers = createQueryClientWrapper({ queryClient });

  const Wrapper: ComponentType<{ children: ReactNode }> = UserWrapper
    ? ({ children }) => (
        <Providers>
          <UserWrapper>{children}</UserWrapper>
        </Providers>
      )
    : Providers;

  return renderHook(callback, {
    ...hookOptions,
    wrapper: Wrapper,
  });
}

/**
 * Runs a hook with QueryClientProvider and RouterProvider (same as {@link customRenderWithRouter}).
 */
export function customRenderHookWithRouter<
  TResult,
  TProps,
  TRouterContext extends Record<string, unknown> = Record<string, unknown>,
>(
  callback: (props: TProps) => TResult,
  options: CustomRenderHookWithRouterOptions<TProps, TRouterContext> = {},
) {
  const {
    queryClient = createTestQueryClient(),
    initialLocation = "/",
    routerContext,
    wrapper: UserWrapper,
    ...hookOptions
  } = options;

  const Providers = createRouterTestWrapper<TRouterContext>({
    queryClient,
    initialLocation,
    routerContext,
  });

  const Wrapper: ComponentType<{ children: ReactNode }> = UserWrapper
    ? ({ children }) => (
        <Providers>
          <UserWrapper>{children}</UserWrapper>
        </Providers>
      )
    : Providers;

  return renderHook(callback, {
    ...hookOptions,
    wrapper: Wrapper,
  });
}
