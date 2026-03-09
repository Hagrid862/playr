import { AppSidebar } from '@/components/app/Sidebar';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useIsMounted } from '@/hooks/use-is-mounted';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import { usePlayerStore } from '@/stores/player.store';
import { AppPlayer } from '../app/Player';
import { Queue } from '../app/Queue';

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { isQueueOpen, setQueueOpen } = usePlayerStore();
  const isDesktop = useMediaQuery('(min-width: 1500px)');
  const mounted = useIsMounted();

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex h-screen w-full relative overflow-hidden">
        {/* Main Content Area */}
        <div
          className={cn(
            'flex-1 flex flex-col relative min-w-0 transition-all duration-300 mt-2',
            !isQueueOpen && isDesktop ? 'mr-2' : '',
          )}
        >
          <div className="mx-auto flex h-full w-full max-w-480 flex-col relative">
            <div className="md:hidden absolute top-4 left-4 z-20">
              <SidebarTrigger className="bg-stone-900/50 backdrop-blur-sm border border-white/10 text-white hover:bg-stone-800" />
            </div>
            <div className="flex-1 overflow-y-auto w-full">
              <main className="w-full pb-32">{children}</main>
            </div>
            <div className="absolute p-2 bottom-2 left-0 right-0 z-10 h-16 flex items-center justify-center max-w-[calc(100vw-2rem)] min-[800px]:max-w-250 mx-auto">
              <AppPlayer />
            </div>
          </div>
        </div>

        {/* Desktop Queue Sidebar */}
        {mounted && isDesktop && (
          <div
            className={cn(
              'border-l border-white/10 bg-stone-900 transition-all duration-300 ease-in-out flex flex-col',
              isQueueOpen ? 'w-100 border-l' : 'w-0 border-none overflow-hidden',
            )}
          >
            <div className="w-100 h-full">
              <Queue />
            </div>
          </div>
        )}

        {/* Mobile/Tablet Queue Sheet */}
        {mounted && !isDesktop && (
          <Sheet open={isQueueOpen} onOpenChange={setQueueOpen}>
            <SheetContent
              side="right"
              className="w-full sm:w-100 p-0 bg-stone-900 border-l border-white/10 text-white"
            >
              <Queue />
            </SheetContent>
          </Sheet>
        )}
      </div>
    </SidebarProvider>
  );
}
