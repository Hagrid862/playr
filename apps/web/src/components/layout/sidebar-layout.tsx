import { AppSidebar } from '@/components/app/Sidebar';
import { MobileBottomNav } from '@/components/app/MobileBottomNav';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useIsMounted } from '@/hooks/use-is-mounted';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import { usePlayerStore } from '@/stores/player-store/player.store';
import { useEffect, useState } from 'react';
import { Lyrics } from '../app/Lyrics';
import { AppPlayer } from '../app/Player';
import { Queue } from '../app/Queue';

// Breakpoints for responsive sidebar behavior:
// Mobile (<768px): sidebar hidden, bottom nav visible
// Medium (768-1199px): sidebar locked collapsed (icon-only), PlayerMobile with controls
// Large (>=1200px): sidebar expandable/collapsible, full desktop player
const MOBILE_BREAKPOINT = '(max-width: 767px)';
const LARGE_BREAKPOINT = '(min-width: 1200px)';

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { isQueueOpen, setQueueOpen, sidebarView } = usePlayerStore();
  const isDesktop = useMediaQuery('(min-width: 1500px)');
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT);
  const isLarge = useMediaQuery(LARGE_BREAKPOINT);
  const mounted = useIsMounted();
  const [isSettledInternal, setIsSettledInternal] = useState(false);

  useEffect(() => {
    if (isQueueOpen) {
      const timer = setTimeout(() => setIsSettledInternal(true), 500);
      return () => {
        clearTimeout(timer);
        setIsSettledInternal(false);
      };
    }
  }, [isQueueOpen]);

  const isSettled = isQueueOpen && isSettledInternal;

  // On large screens, sidebar state is uncontrolled (user can toggle).
  // On medium screens, sidebar is forced collapsed (open=false, no toggle).
  // On mobile, the AppSidebar is not rendered.
  const sidebarOpen = isLarge ? undefined : false;

  return (
    <SidebarProvider open={sidebarOpen}>
      {!isMobile && <AppSidebar />}
      <div className="flex h-screen w-full relative overflow-hidden">
        {/* Main Content Area */}
        <div
          className={cn(
            'flex-1 flex flex-col relative min-w-0 transition-all duration-500 ease-apple mt-2',
            isDesktop ? 'mr-2' : '',
          )}
        >
          <div className="mx-auto flex h-full w-full max-w-480 flex-col relative">
            <div className="flex min-h-0 min-w-0 flex-1 overflow-y-auto w-full">
              <main
                className={cn(
                  'flex h-full min-h-0 w-full flex-col px-4',
                  // On mobile, reserve space for player bar (h-16) + bottom nav (h-14) + gaps
                  // On medium, reserve space for floating player bar
                  isMobile ? 'pb-[8rem]' : !isLarge ? 'pb-[4.5rem]' : 'pb-0',
                )}
              >
                {children}
              </main>
            </div>
            {/* Player Bar — floating rounded on mobile/medium, inline on large desktop */}
            <div
              className={cn(
                'flex items-center justify-center z-[60]',
                isMobile &&
                  'fixed bottom-16 left-3 right-3 h-16 bg-stone-900/95 backdrop-blur-md rounded-lg border border-white/10 shadow-xl shadow-black/30',
                !isMobile && !isLarge &&
                  'absolute bottom-2 left-3 right-3 h-16 bg-stone-900/95 backdrop-blur-md rounded-lg border border-white/10 shadow-xl shadow-black/30',
                isLarge &&
                  'absolute bottom-2 left-0 right-0 h-16 py-1 px-2 max-w-[calc(100vw-2rem)] min-[800px]:max-w-250 mx-auto',
              )}
            >
              <AppPlayer />
            </div>
          </div>
        </div>

        {/* Desktop Queue Sidebar */}
        {mounted && isDesktop && (
          <div
            className={cn(
              'bg-stone-900 transition-all duration-500 ease-apple flex flex-col shadow-2xl overflow-hidden my-2 rounded-xl origin-right',
              isQueueOpen
                ? 'w-[360px] mr-2 border border-white/10 opacity-100 blur-0'
                : 'w-0 mr-0 border-none opacity-50 blur-xs',
            )}
            style={{ height: 'calc(100vh - 1rem)' }}
          >
            <div className="w-[360px] h-full relative">
              <div
                className={cn(
                  'absolute inset-0',
                  isSettled ? 'transition-all duration-300 ease-out' : 'transition-none',
                  sidebarView === 'queue'
                    ? 'opacity-100 scale-100 blur-0 pointer-events-auto'
                    : 'opacity-0 scale-98 blur-xs pointer-events-none',
                )}
              >
                <Queue />
              </div>
              <div
                className={cn(
                  'absolute inset-0',
                  isSettled ? 'transition-all duration-300 ease-out' : 'transition-none',
                  sidebarView === 'lyrics'
                    ? 'opacity-100 scale-100 blur-0 pointer-events-auto'
                    : 'opacity-0 scale-98 blur-xs pointer-events-none',
                )}
              >
                <Lyrics />
              </div>
            </div>
          </div>
        )}

        {/* Mobile/Tablet Queue Sheet */}
        {mounted && !isDesktop && (
          <Sheet open={isQueueOpen} onOpenChange={setQueueOpen}>
            <SheetContent
              side="right"
              className="w-full sm:w-[360px] p-0 bg-stone-900 border-l border-white/10 text-white"
            >
              <div className="w-full h-full relative">
                <div
                  className={cn(
                    'absolute inset-0',
                    isSettled ? 'transition-all duration-300 ease-out' : 'transition-none',
                    sidebarView === 'queue'
                      ? 'opacity-100 scale-100 blur-0 pointer-events-auto'
                      : 'opacity-0 scale-98 blur-sm pointer-events-none',
                  )}
                >
                  <Queue />
                </div>
                <div
                  className={cn(
                    'absolute inset-0',
                    isSettled ? 'transition-all duration-300 ease-out' : 'transition-none',
                    sidebarView === 'lyrics'
                      ? 'opacity-100 scale-100 blur-0 pointer-events-auto'
                      : 'opacity-0 scale-98 blur-sm pointer-events-none',
                  )}
                >
                  <Lyrics />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* Mobile Bottom Navigation — visible only on mobile (<768px) */}
        {isMobile && <MobileBottomNav />}
      </div>
    </SidebarProvider>
  );
}
