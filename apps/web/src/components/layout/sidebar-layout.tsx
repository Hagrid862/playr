import { AppSidebar } from '@/components/app/Sidebar';
import { Card } from '@/components/ui/card';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppPlayer } from '../app/Player';

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex h-screen max-h-[calc(100vh-0.5rem)] w-full flex-col relative overflow-hidden mr-2 mt-2">
        <div className="mx-auto flex h-full w-full max-w-[1920px] flex-col relative">
          <div className="md:hidden absolute top-4 left-4 z-20">
            <SidebarTrigger className="bg-stone-900/50 backdrop-blur-sm border border-white/10 text-white hover:bg-stone-800" />
          </div>
          <div className="flex-1 overflow-y-auto w-full">
            <main className="w-full pb-32">{children}</main>
          </div>
          <Card className="absolute p-2 bottom-2 left-0 right-0 z-10 h-16 border-border/50 shadow-lg flex items-center justify-center bg-stone-900 rounded-lg max-w-[calc(100vw-2rem)] min-[800px]:max-w-[800px] mx-auto">
            <AppPlayer />
          </Card>
        </div>
      </div>
    </SidebarProvider>
  );
}
