import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { Outlet, createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

export const Route = createFileRoute('/app')({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: '/auth/login',
        search: {
          redirect: location.href,
        },
      });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const { auth } = Route.useRouteContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.isAuthenticated) {
      navigate({ to: '/auth/login' });
    }
  }, [auth.isAuthenticated, navigate]);

  return (
    <SidebarLayout>
      <Outlet />
    </SidebarLayout>
  );
}
