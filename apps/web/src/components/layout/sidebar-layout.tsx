import { AppSidebar } from '@/components/app/Sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="w-full">
        {children}
      </main>
    </SidebarProvider>
  );
}
