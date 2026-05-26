import { PlaybackSync } from '@/components/app/PlaybackSync';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { Outlet, createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

import { useAuthStore } from '@/stores/auth.store';

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
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: '/auth/login' });
    }
  }, [isAuthenticated, navigate]);

  return (
    <SidebarLayout>
      <PlaybackSync />
      <Outlet />
    </SidebarLayout>
  );
}
