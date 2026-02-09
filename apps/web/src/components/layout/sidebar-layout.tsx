import { AppSidebar } from '@/components/app/Sidebar';
import { Card } from '@/components/ui/card';
import { SidebarProvider } from '@/components/ui/sidebar';

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex h-screen max-h-[calc(100vh-0.5rem)] w-full flex-col relative overflow-hidden mr-2 mt-2">
        <div className="mx-auto flex h-full w-full max-w-[1920px] flex-col relative">
          <div className="flex-1 overflow-y-auto w-full">
            <main className="w-full pb-32">{children}</main>
          </div>
          <Card className="absolute bottom-2 left-0 right-0 z-10 h-20 border-border/50 shadow-lg backdrop-blur-md flex items-center justify-center bg-stone-900 rounded-lg">
            <span className="text-muted-foreground text-sm">Player Controls Placeholder</span>
          </Card>
        </div>
      </div>
    </SidebarProvider>
  );
}
