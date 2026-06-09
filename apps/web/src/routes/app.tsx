import { PlaybackSync } from '@/components/app/PlaybackSync';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { Outlet, createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { PageHeader } from '@/components/app/PageHeader.tsx';

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

  // Get metadata from the last match

  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: '/auth/login' });
    }
  }, [isAuthenticated, navigate]);

  return (
    <SidebarLayout>
      <div className="flex flex-col h-full w-full">
        <PageHeader />
        <div className="flex-1 overflow-y-auto">
          <PlaybackSync />
          <Outlet />
        </div>
      </div>
    </SidebarLayout>
  );
}
