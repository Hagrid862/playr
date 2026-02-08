import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/')({
  component: App,
});

function App() {
  return (
    <SidebarLayout>
      <div className="p-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your dashboard.</p>
      </div>
    </SidebarLayout>
  );
}
