import { TanStackDevtools } from '@tanstack/react-devtools';
import {
  Outlet,
  createRootRouteWithContext,
  ScrollRestoration,
  useLocation,
  useRouter,
} from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';

import { AuthState } from '@/stores/auth.store';
import { QueryClient } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { useEffect, useRef } from 'react';

interface MyRouterContext {
  queryClient: QueryClient;
  auth: AuthState;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  const router = useRouter();
  const actionRef = useRef<string | null>(null);

  useEffect(() => {
    return router.history.subscribe(({ action }) => {
      actionRef.current = action.type;
    });
  }, [router]);

  useEffect(() => {
    const action = actionRef.current;
    if (
      action === 'BACK' ||
      action === 'FORWARD' ||
      action === 'GO'
    ) {
      return;
    }
    window.scrollTo(0, 0);
    // Target common scrolling containers in this project (like in SidebarLayout and AppLayout)
    const scrollContainers = document.querySelectorAll('.overflow-y-auto');
    scrollContainers.forEach((el) => {
      el.scrollTop = 0;
    });
  }, [pathname]);

  return null;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => (
    <>
      <ScrollRestoration />
      <ScrollToTop />
      <Toaster position="top-right" richColors closeButton />
      <Outlet />
      <TanStackDevtools
        config={{
          position: 'bottom-right',
        }}
        plugins={[
          {
            name: 'Tanstack Router',
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </>
  ),
});
