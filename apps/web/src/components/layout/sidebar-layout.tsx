import { AppSidebar } from '@/components/app/Sidebar';
import { Card } from '@/components/ui/card';
import { SidebarProvider } from '@/components/ui/sidebar';

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex h-screen max-h-screen w-full flex-col overflow-hidden relative mr-1">
        <div className="flex-1 overflow-y-auto w-full">
          <main className="w-full pb-32">{children}</main>
        </div>
        <Card className="absolute bottom-2 left-2 right-2 z-10 h-20 border-border/50 bg-background/80 shadow-lg backdrop-blur-md flex items-center justify-center bg-stone-900">
            <span className="text-muted-foreground text-sm">Player Controls Placeholder</span>
        </Card>
      </div>
    </SidebarProvider>
  );
}
