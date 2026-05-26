import { PlaybackSync } from '@/components/app/PlaybackSync';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { MobileSearchOverlay } from '@/components/search/MobileSearchOverlay';
import { Outlet, createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useState } from 'react';
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
  const [mobileSearchExpanded, setMobileSearchExpanded] = useState(false);

  const handleMobileSearchToggle = useCallback(() => {
    setMobileSearchExpanded((prev) => !prev);
  }, []);

  const handleMobileSearchClose = useCallback(() => {
    setMobileSearchExpanded(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: '/auth/login' });
    }
  }, [isAuthenticated, navigate]);

  return (
    <SidebarLayout>
      <div className="flex flex-col h-full w-full">
        <PageHeader
          mobileSearchExpanded={mobileSearchExpanded}
          onMobileSearchToggle={handleMobileSearchToggle}
        />
        <div className="flex-1 relative">
          {/* Mobile full-screen search overlay — covers the page content area */}
          <MobileSearchOverlay
            isOpen={mobileSearchExpanded}
            onClose={handleMobileSearchClose}
          />
          <div className="overflow-y-auto h-full">
            <PlaybackSync />
            <Outlet />
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
