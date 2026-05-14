import { AppSidebar } from '@/components/app/Sidebar';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useIsMounted } from '@/hooks/use-is-mounted';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import { usePlayerStore } from '@/stores/player-store/player.store';
import { useEffect, useState } from 'react';
import { Lyrics } from '../app/Lyrics';
import { AppPlayer } from '../app/Player';
import { Queue } from '../app/Queue';

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { isQueueOpen, setQueueOpen, sidebarView } = usePlayerStore();
  const isDesktop = useMediaQuery('(min-width: 1500px)');
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

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex h-screen w-full relative overflow-hidden">
        {/* Main Content Area */}
        <div
          className={cn(
            'flex-1 flex flex-col relative min-w-0 transition-all duration-500 ease-apple mt-2',
            isDesktop ? 'mr-2' : '',
          )}
        >
          <div className="mx-auto flex h-full w-full max-w-480 flex-col relative">
            <div className="md:hidden absolute top-4 left-4 z-20">
              <SidebarTrigger className="bg-stone-900/50 backdrop-blur-sm border border-white/10 text-white hover:bg-stone-800" />
            </div>
            <div className="flex-1 overflow-y-auto w-full">
              <main className="w-full pb-32">{children}</main>
            </div>
            <div className="absolute p-2 bottom-2 left-0 right-0 z-[60] h-16 flex items-center justify-center max-w-[calc(100vw-2rem)] min-[800px]:max-w-250 mx-auto">
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
      </div>
    </SidebarProvider>
  );
}
