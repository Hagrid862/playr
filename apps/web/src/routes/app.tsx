import { PlaybackSync } from '@/components/app/PlaybackSync';
import { PlayerFullPage } from '@/components/app/player/PlayerFullPage';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { MobileSearchOverlay } from '@/components/search/MobileSearchOverlay';
import { Outlet, createFileRoute } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { PageHeader } from '@/components/app/PageHeader.tsx';
import { usePlayerStore } from '@/stores/player-store/player.store';
import { cn } from '@/lib/utils';

import { useAuthStore } from '@/stores/auth.store';
import { GuestOverlay } from '@/components/app/GuestOverlay';

export const Route = createFileRoute('/app')({
  component: AppLayout,
});

function AppLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [mobileSearchExpanded, setMobileSearchExpanded] = useState(false);
  const { isPlayerExpanded } = usePlayerStore();

  const handleMobileSearchToggle = useCallback(() => {
    setMobileSearchExpanded((prev) => !prev);
  }, []);

  const handleMobileSearchClose = useCallback(() => {
    setMobileSearchExpanded(false);
  }, []);

  return (
    <SidebarLayout>
      <div className="flex flex-col h-full w-full">
        {!isAuthenticated && <GuestOverlay />}
        <PageHeader
          mobileSearchExpanded={mobileSearchExpanded}
          onMobileSearchToggle={handleMobileSearchToggle}
        />
        <div className="flex-1 relative">
          <MobileSearchOverlay isOpen={mobileSearchExpanded} onClose={handleMobileSearchClose} />
          {/* Full-page Player overlay — slides up from bottom, header stays visible */}
          <PlayerFullPage />
          <div className="overflow-y-auto h-full">
            <div
              className={cn(
                'min-h-full',
                // Reserve space for player bar and bottom nav, plus extra "scroll further" room
                // Mobile: Player (4rem) + Nav (3.5rem) + extra = 12rem (pb-48)
                // Desktop: Player (4.5rem) + extra = 10rem (pb-40)
                !isPlayerExpanded ? 'pb-48 md:pb-40' : 'pb-8',
              )}
            >
              <PlaybackSync />
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
